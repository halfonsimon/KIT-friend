// src/app/api/digest/send/route.ts
import { NextResponse } from "next/server";
import { smtpMailer } from "@/lib/mailer";
import { runScheduledDigests, sendTestDigest } from "@/lib/digest-delivery";
import { getAccount } from "@/lib/account";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      if (!session?.user?.id) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }

      // The account email stored on the user, the same one the preview and the scheduled run use.
      const { email } = await getAccount(session.user.id);
      const result = await sendTestDigest({
        userId: session.user.id,
        accountEmail: email,
        now: new Date(),
        mailer: smtpMailer(),
      });

      return NextResponse.json({
        ok: true,
        sent: [result.recipient],
        messageId: result.messageId,
        stats: result.stats,
      });
    }

    // ── Cron mode: verify CRON_SECRET, then run every user's digest ──
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
    }
    const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
    if (bearer !== cronSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const results = await runScheduledDigests({ now: new Date(), mailer: smtpMailer() });
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("digest send error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
