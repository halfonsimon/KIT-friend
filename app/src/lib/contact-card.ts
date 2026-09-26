/**
 * Contact card: how one Contact reads on screen and in the Digest. A pure
 * projection of one Contact roster row at `now`, so a Contact reads the same
 * everywhere; this module is the one home of Contact wording.
 * All dates are shown by UTC calendar day, like the due rules in ./due.
 */
import type { Category } from "./contact";
import type { Computed } from "./due";
import type { RosterContact } from "./roster";

/** Paused wins over due status; Due now covers overdue and due today. */
export type CardState = "paused" | "due" | "upToDate";

/** One Contact as the screens show it (plain, serialisable). */
export type ContactCard = {
  id: string;
  name: string;
  phone: string | null;
  category: Category;
  intervalDays: number;
  state: CardState;
  /** When they're next due: "Now", "Tomorrow", "In 5 days", or "Paused". */
  nextDue: string;
  /** "Last talked on 27 March", or when they were added if never. */
  lastTalked: string;
  /** The same, shorter, for tight rows: "Last talked 27 March". */
  lastTalkedShort: string;
  /** The Interval in words: "Every day" or "Every 7 days". */
  every: string;
  // Relationship memory, for the memory panel.
  aiSummary: string | null;
  keyTopics: string[];
  followUps: string[];
  /** Up to three things to bring up: follow-ups first, else key topics. */
  nextCall: string[];
};

/**
 * "27 March" by UTC day, with the year only when it isn't `now`'s year.
 * Without `now`, always with the year: "27 March 2026".
 */
export const dayMonth = (d: Date, now?: Date) =>
  d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    ...(now && d.getUTCFullYear() === now.getUTCFullYear() ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });

/** The Digest's words for a due status: "3d overdue", "Due today" or "5d left". */
export function digestStatusLabel(c: Pick<Computed, "status" | "daysUntilDue">): string {
  if (c.status === "overdue") return `${Math.abs(c.daysUntilDue)}d overdue`;
  if (c.status === "today") return "Due today";
  return `${c.daysUntilDue}d left`;
}

function nextDueLabel(state: CardState, daysUntilDue: number) {
  if (state === "paused") return "Paused";
  if (state === "due") return "Now";
  return daysUntilDue === 1 ? "Tomorrow" : `In ${daysUntilDue} days`;
}

export function contactCard(c: RosterContact, now: Date): ContactCard {
  const state: CardState = !c.isActive ? "paused" : c.status === "ok" ? "upToDate" : "due";
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    category: c.category,
    intervalDays: c.intervalDays,
    state,
    nextDue: nextDueLabel(state, c.daysUntilDue),
    lastTalked: c.lastContactedAt
      ? `Last talked on ${dayMonth(c.lastContactedAt, now)}`
      : `Added on ${dayMonth(c.createdAt, now)}`,
    lastTalkedShort: c.lastContactedAt
      ? `Last talked ${dayMonth(c.lastContactedAt, now)}`
      : `Added ${dayMonth(c.createdAt, now)}`,
    every: c.intervalDays === 1 ? "Every day" : `Every ${c.intervalDays} days`,
    aiSummary: c.aiSummary,
    keyTopics: c.keyTopics,
    followUps: c.followUps,
    nextCall: (c.followUps.length > 0 ? c.followUps : c.keyTopics).slice(0, 3),
  };
}

/**
 * The Contacts list: a roster's cards with active Contacts first, in the
 * roster's due order, and the Paused ones after.
 */
export function contactList(rows: RosterContact[], now: Date): ContactCard[] {
  const cards = rows.map((c) => contactCard(c, now));
  return [...cards.filter((c) => c.state !== "paused"), ...cards.filter((c) => c.state === "paused")];
}
