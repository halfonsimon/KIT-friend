// src/app/api/digest/send/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildDigest } from "@/lib/digest";
import { renderDigestEmail } from "@/lib/email";
import { sendDigestSMTP } from "@/lib/mailer";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIGEST_WINDOW_MINUTES = 30;

export async function GET(request: Request) {
  return POST(request);
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

/**
 * Two modes:
 * - ?test=true  → authenticated user sends their own digest (UI "Send Test Email" button)
 * - no test     → cron job sends digest to all users (requires CRON_SECRET bearer)
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const isTest = url.searchParams.get("test") === "true";

    if (!hasSMTP()) {
      return NextResponse.json(
        { ok: false, error: "SMTP env vars missing (SMTP_HOST/USER/PASS and FROM_EMAIL)." },
        { status: 400 }
      );
    }

    // ── Test mode: send only the current user's digest ──────────────
    if (isTest) {
      const session = await auth();
      if (!session?.user?.id || !session.user.email) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }

      const userId = session.user.id;
      const userSettings = await prisma.setting.findUnique({ where: { userId } });
      const email = userSettings?.digestEmail || session.user.email;

      const data = await buildDigest(new Date(), userId);
      const { subject, html } = renderDigestEmail(data);
      const result = await sendDigestSMTP([email], subject, html);

      return NextResponse.json({
        ok: true,
        sent: [email],
        messageId: result.messageId,
        stats: data.stats,
      });
    }

    // ── Cron mode: verify CRON_SECRET, then iterate all users ───────
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
    }
    const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
    if (bearer !== cronSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Find all users with digest enabled
    const userSettings = await prisma.setting.findMany({
      where: { sendEmailDigest: true, userId: { not: null } },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    // Also handle users without settings (defaults: digest enabled)
    const usersWithSettings = new Set(userSettings.map((s) => s.userId));
    const usersWithoutSettings = await prisma.user.findMany({
      where: { id: { notIn: [...usersWithSettings].filter((id): id is string => id !== null) } },
      select: { id: true, email: true, name: true },
    });

    const results: { userId: string; email: string; status: string; messageId?: string }[] = [];

    const allDigestTargets = [
      ...userSettings.map((s) => ({
        userId: s.userId!,
        email: s.digestEmail || s.user?.email,
        digestTime: s.digestTime,
        lastEmailDigestAt: s.lastEmailDigestAt,
        settingId: s.id,
      })),
      ...usersWithoutSettings.map((u) => ({
        userId: u.id,
        email: u.email,
        digestTime: "06:00",
        lastEmailDigestAt: null as Date | null,
        settingId: null as number | null,
      })),
    ];

    for (const target of allDigestTargets) {
      if (!target.email) {
        results.push({ userId: target.userId, email: "", status: "skipped_no_email" });
        continue;
      }

      // Idempotency check
      if (target.lastEmailDigestAt) {
        const last = new Date(target.lastEmailDigestAt);
        const nowUtcDay = new Date().toISOString().slice(0, 10);
        const lastUtcDay = last.toISOString().slice(0, 10);
        if (nowUtcDay === lastUtcDay) {
          results.push({ userId: target.userId, email: target.email, status: "already_sent_today" });
          continue;
        }
      }

      // Time window check
      const now = new Date();
      const [targetHour, targetMinute] = (target.digestTime ?? "06:00").split(":").map(Number);
      const targetMinutes = targetHour * 60 + targetMinute;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      if (!isWithinDigestWindow(currentMinutes, targetMinutes)) {
        results.push({ userId: target.userId, email: target.email, status: "not_time_yet" });
        continue;
      }

      const data = await buildDigest(new Date(), target.userId);
      const { subject, html } = renderDigestEmail(data);

      try {
        const result = await sendDigestSMTP([target.email], subject, html);

        if (target.settingId) {
          await prisma.setting.update({
            where: { id: target.settingId },
            data: { lastEmailDigestAt: new Date() },
          });
        } else {
          await prisma.setting.create({
            data: { userId: target.userId, lastEmailDigestAt: new Date() },
          });
        }

        results.push({
          userId: target.userId,
          email: target.email,
          status: "sent",
          messageId: result.messageId,
        });
      } catch (err) {
        console.error(`Failed to send digest to ${target.email}:`, err);
        results.push({ userId: target.userId, email: target.email, status: "error" });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("digest send error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
