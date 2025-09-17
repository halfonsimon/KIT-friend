// src/app/api/digest/send/route.ts
import { NextResponse } from "next/server";
import { buildDigest } from "@/lib/digest";
import { renderDigestEmail } from "@/lib/email";
import { sendDigestSMTP } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// src/app/api/digest/send/route.ts
export async function GET() {
  // réutilise exactement la même logique que POST
  return POST();
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

export async function POST() {
  try {
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

    // Check if it's the right time to send (within 10 minutes of configured time)
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

    // Check if we're within 10 minutes of target time (to avoid missing due to cron timing)
    const timeDiff = Math.abs(currentMinutes - targetMinutes);
    if (timeDiff > 10 && timeDiff < 24 * 60 - 10) {
      // Not within 10 minutes, and not crossing midnight
      return NextResponse.json({
        ok: false,
        error: `Not time to send digest yet. Current: ${currentTime}, Target: ${targetTime}`,
        skipped: true,
        currentTime,
        targetTime,
      });
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
