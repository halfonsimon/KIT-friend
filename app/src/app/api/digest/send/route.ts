// src/app/api/digest/send/route.ts
// Simulated sender: builds the email but does NOT send it.
// Returns 501 with subject + html length so you can see it would work.

import { NextResponse } from "next/server";
import { buildDigest } from "../../../../lib/digest";
import { renderDigestEmail } from "../../../../lib/email";

export const dynamic = "force-dynamic";

export async function POST() {
  const data = await buildDigest(new Date());
  const { subject, html } = renderDigestEmail(data);
  return NextResponse.json(
    { ok: false, reason: "Not implemented", subject, htmlLength: html.length },
    { status: 501 }
  );
}
