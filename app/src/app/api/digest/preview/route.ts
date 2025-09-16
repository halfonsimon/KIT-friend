// src/app/api/digest/preview/route.ts
import { NextResponse } from "next/server";
import { buildDigest } from "../../../../lib/digest";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await buildDigest(new Date());
  // Convert dates to ISO for JSON
  const toIso = (x: { nextDueAt: Date; [key: string]: unknown }) => ({
    ...x,
    nextDueAt: x.nextDueAt.toISOString(),
  });
  return NextResponse.json({
    ok: true,
    stats: data.stats,
    overdue: data.overdue.map(toIso),
    today: data.today.map(toIso),
    upcoming: data.upcoming.map(toIso),
  });
}
