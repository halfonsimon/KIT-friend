// src/app/api/digest/preview/route.ts
import { NextResponse } from "next/server";
import { buildDigest } from "@/lib/digest";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const data = await buildDigest(new Date(), session.user.id);
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
