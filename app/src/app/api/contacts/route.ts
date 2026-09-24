// src/app/api/contacts/route.ts
import { NextResponse } from "next/server";
import { roster } from "@/lib/roster";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const url = new URL(req.url);
    const onlyActive = url.searchParams.get("active") === "1";

    const contacts = await roster(userId, new Date(), { activeOnly: onlyActive });
    const rows = contacts.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      category: c.category,
      intervalDays: c.intervalDays,
      lastContactedAt: c.lastContactedAt,
      createdAt: c.createdAt,
      lastReminderSentAt: c.lastReminderSentAt,
      isActive: c.isActive,
      notes: c.notes,
      status: c.status,
      daysUntilDue: c.daysUntilDue,
      nextDueAt: c.nextDueAt.toISOString(),
    }));

    return NextResponse.json({ ok: true, count: rows.length, data: rows });
  } catch (err) {
    console.error("GET /api/contacts error", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
