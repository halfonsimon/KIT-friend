import type { Category } from "@/lib/contact";
import type { RosterContact } from "@/lib/roster";

/** A due Contact as Today's client components need it (plain, serialisable). */
export type TodayPerson = {
  id: string;
  name: string;
  phone: string | null;
  category: Category;
  intervalDays: number;
  /** "Last talked on 27 March", or when they were added if never. */
  lastTalked: string;
  /** The same, shorter, for tight rows: "Last talked 27 March". */
  lastTalkedShort: string;
  aiSummary: string | null;
  keyTopics: string[];
  followUps: string[];
  /** Up to three things to bring up: follow-ups first, else key topics. */
  nextCall: string[];
};

const dayMonth = (d: Date, now: Date) =>
  d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    ...(d.getUTCFullYear() === now.getUTCFullYear() ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });

export function toTodayPerson(c: RosterContact, now: Date): TodayPerson {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    category: c.category,
    intervalDays: c.intervalDays,
    lastTalked: c.lastContactedAt
      ? `Last talked on ${dayMonth(c.lastContactedAt, now)}`
      : `Added on ${dayMonth(c.createdAt, now)}`,
    lastTalkedShort: c.lastContactedAt
      ? `Last talked ${dayMonth(c.lastContactedAt, now)}`
      : `Added ${dayMonth(c.createdAt, now)}`,
    aiSummary: c.aiSummary,
    keyTopics: c.keyTopics,
    followUps: c.followUps,
    nextCall: (c.followUps.length > 0 ? c.followUps : c.keyTopics).slice(0, 3),
  };
}

export const everyLabel = (days: number) => (days === 1 ? "Every day" : `Every ${days} days`);

/** "Last talked on 27 March" → "last talked on 27 March", for use after a comma. */
export const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** "Family, last talked on 27 March". */
export const categoryAndLastTalked = (label: string, p: Pick<TodayPerson, "lastTalked">) =>
  `${label}, ${lowerFirst(p.lastTalked)}`;

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** 3 → "Three", 12 → "12": words read better at the start of a sentence. */
export const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);
