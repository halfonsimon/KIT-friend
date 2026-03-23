// src/app/api/contacts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toContactLike } from "@/lib/contact";
import { computeStatus } from "@/lib/due";
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

    const where: { userId: string; isActive?: boolean } = { userId };
    if (onlyActive) where.isActive = true;

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    const now = new Date();
    const rows = contacts.map((c) => {
      const computed = computeStatus(toContactLike(c), now);
      return {
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
        status: computed.status,
        daysUntilDue: computed.daysUntilDue,
        nextDueAt: computed.nextDueAt.toISOString(),
      };
    });

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
