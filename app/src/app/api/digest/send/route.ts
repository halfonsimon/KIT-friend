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
