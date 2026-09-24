/**
 * Contact roster: one user's contacts with their due status, in due order
 * (overdue, then today, then ok; each by earliest due date).
 * This is the one place that lists contacts by due status. The pure due
 * rules live in ./due.
 */
import { prisma } from "./db";
import { asCategory, type Category } from "./contact";
import { computeStatus, type Computed, type Status } from "./due";

export type RosterContact = Computed & {
  id: string;
  name: string;
  phone: string | null;
  category: Category;
  intervalDays: number;
  createdAt: Date;
  lastContactedAt: Date | null;
  lastReminderSentAt: Date | null;
  isActive: boolean;
  notes: string | null;
  hasAiSummary: boolean;
};

const STATUS_ORDER: Record<Status, number> = { overdue: 0, today: 1, ok: 2 };

function byDueOrder(a: RosterContact, b: RosterContact) {
  const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (s !== 0) return s;
  return a.nextDueAt.getTime() - b.nextDueAt.getTime();
}

/** List one user's contacts by due status at `now`. */
export async function roster(
  userId: string,
  now: Date,
  options: { activeOnly?: boolean } = {}
): Promise<RosterContact[]> {
  const contacts = await prisma.contact.findMany({
    where: { userId, ...(options.activeOnly ? { isActive: true } : {}) },
    orderBy: { createdAt: "asc" },
  });

  return contacts
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      category: asCategory(c.category),
      intervalDays: c.intervalDays,
      createdAt: c.createdAt,
      lastContactedAt: c.lastContactedAt,
      lastReminderSentAt: c.lastReminderSentAt,
      isActive: c.isActive,
      notes: c.notes,
      hasAiSummary: !!c.aiSummary,
      ...computeStatus(c, now),
    }))
    .sort(byDueOrder);
}
