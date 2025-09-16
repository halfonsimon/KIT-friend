// src/lib/digest.ts
// Build the daily digest from the DB using the same due logic as the list page.

import { prisma } from "./db";
import { computeStatus, type ContactLike } from "./due";

export type Category = "FAMILY" | "FRIEND" | "WORK" | "OTHER";
export type NotifyChannel = "NONE" | "EMAIL";
export type Status = "overdue" | "today" | "ok";

export type DigestItem = {
  id: string;
  name: string;
  category: Category;
  status: Status;
  daysUntilDue: number;
  nextDueAt: Date;
  notifyChannel: NotifyChannel;
};

export type DigestData = {
  overdue: DigestItem[];
  today: DigestItem[];
  // Up to 2 soonest “ok” items
  upcoming: DigestItem[];
  stats: { overdue: number; today: number; upcoming: number; total: number };
  // Same items but only those with notifyChannel !== "NONE"
  notifiable: DigestItem[];
};

/** Helper: sort by next due (earliest first). */
function byNextDue(a: DigestItem, b: DigestItem) {
  return a.nextDueAt.getTime() - b.nextDueAt.getTime();
}

/** Build the digest for a given moment (defaults to now). */
export async function buildDigest(now: Date = new Date()): Promise<DigestData> {
  // 1) Load only active contacts; we need minimal fields
  const rows = await prisma.contact.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      category: true,
      intervalDays: true,
      createdAt: true,
      lastContactedAt: true,
      notifyChannel: true,
    },
  });

  // 2) Compute status for each using the shared due logic
  const items: DigestItem[] = rows.map((c) => {
    const base: ContactLike = {
      id: c.id,
      name: c.name,
      intervalDays: c.intervalDays,
      createdAt: c.createdAt,
      lastContactedAt: c.lastContactedAt ?? undefined,
    };
    const s = computeStatus(base, now);
    return {
      id: c.id,
      name: c.name,
      category: c.category as Category,
      status: s.status as Status,
      daysUntilDue: s.daysUntilDue,
      nextDueAt: s.nextDueAt,
      notifyChannel: c.notifyChannel as NotifyChannel,
    };
  });

  // 3) Sort globally by next due, then split by status
  items.sort(byNextDue);
  const overdue = items.filter((i) => i.status === "overdue");
  const today = items.filter((i) => i.status === "today");
  const ok = items.filter((i) => i.status === "ok");

  // 4) Upcoming = first 2 “ok”
  const upcoming = ok.slice(0, 2);

  // 5) Stats + notifiable (only from the 3 buckets we show)
  const shown = [...overdue, ...today, ...upcoming];
  const notifiable = shown.filter((i) => i.notifyChannel !== "NONE");

  return {
    overdue,
    today,
    upcoming,
    stats: {
      overdue: overdue.length,
      today: today.length,
      upcoming: upcoming.length,
      total: shown.length,
    },
    notifiable,
  };
}
