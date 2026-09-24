// src/lib/digest.ts
// Build the daily digest from the DB using the same due logic as the list page.

import { type Status } from "./due";
import { roster } from "./roster";
import { getSettings } from "./settings";
import type { Category } from "./contact";

export type DigestItem = {
  id: string;
  name: string;
  phone: string | null;
  category: Category;
  status: Status;
  daysUntilDue: number;
  nextDueAt: Date;
};

export type DigestData = {
  overdue: DigestItem[];
  today: DigestItem[];
  // The first `upcomingCount` "ok" items (from settings)
  upcoming: DigestItem[];
  stats: { overdue: number; today: number; upcoming: number; total: number };
};

/** Build one user's digest for a given moment. */
export async function buildDigest(userId: string, now: Date = new Date()): Promise<DigestData> {
  const [settings, contacts] = await Promise.all([
    getSettings(userId),
    roster(userId, now, { activeOnly: true }),
  ]);

  const items: DigestItem[] = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    category: c.category,
    status: c.status,
    daysUntilDue: c.daysUntilDue,
    nextDueAt: c.nextDueAt,
  }));

  const overdue = items.filter((i) => i.status === "overdue");
  const today = items.filter((i) => i.status === "today");
  const upcoming = items.filter((i) => i.status === "ok").slice(0, settings.upcomingCount);

  return {
    overdue,
    today,
    upcoming,
    stats: {
      overdue: overdue.length,
      today: today.length,
      upcoming: upcoming.length,
      total: overdue.length + today.length + upcoming.length,
    },
  };
}
