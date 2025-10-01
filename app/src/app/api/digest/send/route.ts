// src/app/api/digest/send/route.ts
import { NextResponse } from "next/server";
import { buildDigest } from "@/lib/digest";
import { renderDigestEmail } from "@/lib/email";
import { sendDigestSMTP } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// src/app/api/digest/send/route.ts
export async function GET(request: Request) {
  // réutilise exactement la même logique que POST
  return POST(request);
}
function recipients(): string[] {
  return (process.env.DIGEST_TO || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasSMTP() {
  return (
    !!process.env.SMTP_HOST &&
    !!process.env.SMTP_USER &&
    !!process.env.SMTP_PASS &&
    !!process.env.FROM_EMAIL
  );
}

export async function POST(request: Request) {
  try {
    // Check for test mode parameter
    const url = new URL(request.url);
    const isTest = url.searchParams.get("test") === "true";

    // Check if email digest is enabled
    const { prisma } = await import("@/lib/db");
    const settings = await prisma.setting.findFirst();

    if (!settings?.sendEmailDigest) {
      return NextResponse.json({
        ok: false,
        error: "Email digest is disabled in settings",
        skipped: true,
      });
    }

    // Idempotency: if we already sent a digest today, skip (only for real runs)
    if (!isTest && (settings as any)?.lastEmailDigestAt) {
      const last = new Date((settings as any).lastEmailDigestAt);
      const nowUtcDay = new Date().toISOString().slice(0, 10);
      const lastUtcDay = last.toISOString().slice(0, 10);
      if (nowUtcDay === lastUtcDay) {
        return NextResponse.json({
          ok: false,
          skipped: true,
          error: "Digest already sent today",
          lastEmailDigestAt: (settings as any).lastEmailDigestAt,
        });
      }
    }

    // Check if it's the right time to send (within 10 minutes of configured time)
    // Skip this check in test mode
    if (!isTest) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      const targetTime = settings.digestTime || "06:00";

      // Parse target time
      const [targetHour, targetMinute] = targetTime.split(":").map(Number);
      const targetMinutes = targetHour * 60 + targetMinute;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Check if we're within 30 minutes of target time (to avoid missing due to cron timing)
      const timeDiff = Math.abs(currentMinutes - targetMinutes);
      if (timeDiff > 30 && timeDiff < 24 * 60 - 30) {
        // Not within 10 minutes, and not crossing midnight
        return NextResponse.json({
          ok: false,
          error: `Not time to send digest yet. Current: ${currentTime}, Target: ${targetTime}`,
          skipped: true,
          currentTime,
          targetTime,
        });
      }
    }

    const data = await buildDigest(new Date());
    const { subject, html } = renderDigestEmail(data);

    const to = recipients();
    if (!to.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "Set DIGEST_TO in .env.local",
          subject,
          htmlLength: html.length,
        },
        { status: 400 }
      );
    }

    if (!hasSMTP()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "SMTP env vars missing (SMTP_HOST/PORT/USER/PASS and FROM_EMAIL).",
          subject,
          htmlLength: html.length,
        },
        { status: 400 }
      );
    }

    const result = await sendDigestSMTP(to, subject, html);

    // Mark as sent now (idempotency for the day)
    if (!isTest) {
      await prisma.setting.update({
        where: { id: 1 },
        data: { lastEmailDigestAt: new Date() } as any,
      });
    }

    return NextResponse.json({
      ok: true,
      sent: to,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      stats: data.stats,
    });
  } catch (err) {
    console.error("digest send error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
