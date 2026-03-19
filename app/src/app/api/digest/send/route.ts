// src/app/api/digest/send/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildDigest } from "@/lib/digest";
import { renderDigestEmail } from "@/lib/email";
import { sendDigestSMTP } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIGEST_WINDOW_MINUTES = 30;

export async function GET(request: Request) {
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

function isWithinDigestWindow(currentMinutes: number, targetMinutes: number) {
  const timeDiff = Math.abs(currentMinutes - targetMinutes);
  return (
    timeDiff <= DIGEST_WINDOW_MINUTES ||
    timeDiff >= 24 * 60 - DIGEST_WINDOW_MINUTES
  );
}

export async function POST(request: Request) {
  try {
    // Check for test mode parameter
    const url = new URL(request.url);
    const isTest = url.searchParams.get("test") === "true";

    const settings = await prisma.setting.findUnique({
      where: { id: 1 },
      select: {
        sendEmailDigest: true,
        digestTime: true,
        lastEmailDigestAt: true,
      },
    });

    if (settings?.sendEmailDigest === false) {
      return NextResponse.json({
        ok: false,
        error: "Email digest is disabled in settings",
        skipped: true,
      });
    }

    // Idempotency: if we already sent a digest today, skip (only for real runs)
    const lastEmailDigestAt = settings?.lastEmailDigestAt ?? null;
    if (!isTest && lastEmailDigestAt) {
      const last = new Date(lastEmailDigestAt);
      const nowUtcDay = new Date().toISOString().slice(0, 10);
      const lastUtcDay = last.toISOString().slice(0, 10);
      if (nowUtcDay === lastUtcDay) {
        return NextResponse.json({
          ok: false,
          skipped: true,
          error: "Digest already sent today",
          lastEmailDigestAt,
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
      const targetTime = settings?.digestTime ?? "06:00";

      // Parse target time
      const [targetHour, targetMinute] = targetTime.split(":").map(Number);
      const targetMinutes = targetHour * 60 + targetMinute;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Allow a 30-minute window so schedulers do not need minute-perfect timing.
      if (!isWithinDigestWindow(currentMinutes, targetMinutes)) {
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
      await prisma.setting.upsert({
        where: { id: 1 },
        create: { id: 1, lastEmailDigestAt: new Date() },
        update: { lastEmailDigestAt: new Date() },
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
