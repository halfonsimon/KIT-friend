// src/app/api/contacts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { computeStatus, type ContactLike } from "../../../lib/due";

export const dynamic = "force-dynamic"; // always run on server, no caching

// Map Prisma Contact to ContactLike that our due logic expects
function toContactLike(c: {
  id: string;
  name: string;
  intervalDays: number;
  createdAt: Date;
  lastContactedAt: Date | null;
}): ContactLike {
  return {
    id: c.id,
    name: c.name,
    intervalDays: c.intervalDays,
    createdAt: c.createdAt,
    lastContactedAt: c.lastContactedAt ?? undefined,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    // ?active=0 to include inactive; default is only active
    const onlyActive = url.searchParams.get("active") !== "0";

    const contacts = await prisma.contact.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { createdAt: "asc" }, // base ordering; we’ll sort again after computing status
    });

    const now = new Date();
    const rows = contacts.map((c) => {
      const computed = computeStatus(toContactLike(c), now);
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        category: c.category,
        intervalDays: c.intervalDays,
        lastContactedAt: c.lastContactedAt,
        createdAt: c.createdAt,
        lastReminderSentAt: c.lastReminderSentAt,
        notifyChannel: c.notifyChannel,
        isActive: c.isActive,
        notes: c.notes,
        status: computed.status,
        daysUntilDue: computed.daysUntilDue,
        nextDueAt: computed.nextDueAt.toISOString(), // serialize Date for JSON
      };
    });

    // Sort: Overdue → Today → OK, then by nextDueAt ascending
    const order: Record<"overdue" | "today" | "ok", number> = {
      overdue: 0,
      today: 1,
      ok: 2,
    };
    rows.sort((a, b) => {
      const s =
        order[a.status as "overdue" | "today" | "ok"] -
        order[b.status as "overdue" | "today" | "ok"];
      if (s !== 0) return s;
      return new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime();
    });

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
