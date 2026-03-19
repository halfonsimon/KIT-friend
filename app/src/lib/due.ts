/**
 * Contact due date computation logic.
 * 
 * This module calculates when a contact is "due" for follow-up based on:
 * - The last time you contacted them (or their creation date if never contacted)
 * - Their configured interval in days
 * 
 * All date calculations use UTC to avoid timezone/DST issues.
 */

export type ContactLike = {
  id: string;
  name: string;
  phone: string | null;
  intervalDays: number; // >= 1
  createdAt: Date | string;
  lastContactedAt?: Date | string | null;
};

export type Status = "overdue" | "today" | "ok";

export type Computed = {
  nextDueAt: Date; // due date (Date)
  daysUntilDue: number; // whole days; can be negative
  status: Status;
};

/* ========== Date helpers (UTC, date-only logic) ========== */

// Convert Date or ISO string to Date (or null if missing/invalid)
function asDate(x: Date | string | undefined | null): Date | null {
  // - if x is a Date → return it
  // - if x is a string → new Date(x); if invalid → return null
  // - otherwise → return null

  if (x instanceof Date) {
    return x; // returning as-is is fine; cloning is optional
  }

  if (typeof x === "string") {
    const s = x.trim(); // trim whitespace
    if (s.length === 0) return null; // empty string is invalid
    const d = new Date(s); // parse the string as a date
    if (Number.isNaN(d.getTime())) return null; // invalid date string
    return d;
  }

  return null;
}

const MS_PER_DAY = 86_400_000; // 24 * 60 * 60 * 1000

// Start of UTC day (YYYY-MM-DD at 00:00:00Z)
function startOfUtcDay(d: Date): Date {
  // Use UTC components to avoid timezone/DST surprises
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

// Add N days in UTC (calendar logic)
function addDaysUtc(d: Date, days: number): Date {
  // Clone the input (Date is mutable), normalize to start of day, then add days
  const base = startOfUtcDay(d);
  const out = new Date(base.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

// Integer day difference between two dates (a - b), using date-only UTC
function diffDaysUtc(a: Date, b: Date): number {
  // Compare midnight-UTC values only; floor to keep whole days
  const a0 = startOfUtcDay(a).getTime();
  const b0 = startOfUtcDay(b).getTime();
  return Math.floor((a0 - b0) / MS_PER_DAY);
}

/* ========== Per-contact computation ========== */

// calculate if a contact is overdue, today, or upcoming
export function computeStatus(
  contact: ContactLike,
  now: Date = new Date()
): Computed {
  if (!contact?.id) throw new Error("Contact must have an id");

  // 1) Determine anchor: lastContactedAt || createdAt (normalize to Date)
  const last = asDate(contact.lastContactedAt);
  const created = asDate(contact.createdAt);

  // Policy: if both are missing/invalid, fall back to "now" so the app stays usable.
  // (Alternative would be to throw an error.)
  const anchor = last ?? created ?? now;

  // 2) Compute due date from anchor + intervalDays (calendar days in UTC)
  const interval = Math.max(1, Math.floor(contact.intervalDays || 0)); // defensive clamp
  const nextDueAt = addDaysUtc(anchor, interval);

  // 3) Compute delta in whole days relative to now (can be negative)
  const daysUntilDue = diffDaysUtc(nextDueAt, now);

  // 4) Derive status from date-only comparison
  let status: Status;
  if (daysUntilDue < 0) status = "overdue";
  else if (daysUntilDue === 0) status = "today";
  else status = "ok";

  return { nextDueAt, daysUntilDue, status };
}

/* ========== Digest grouping ========== */

// type for the groups of contacts
export type DigestGroups = {
  overdue: (ContactLike & Computed)[];
  today: (ContactLike & Computed)[];
  upcoming: (ContactLike & Computed)[]; // max limited, daysUntilDue in [1..N]
};

// Sort comparator: earliest nextDueAt first
function byNextDueAsc<A extends Computed>(a: A, b: A) {
  return a.nextDueAt.getTime() - b.nextDueAt.getTime();
}

// organize contacts into overdue, today, and upcoming groups for the interface
export function groupForDigest(
  contacts: ContactLike[],
  now: Date = new Date(),
  upcomingDays: number = 3,
  upcomingLimit: number = 2
): DigestGroups {
  // 1) Compute status for each contact (keep original fields + computed fields)
  const rows = contacts.map((c) => ({ ...c, ...computeStatus(c, now) }));

  // 2) Split into groups
  const overdue = rows.filter((r) => r.status === "overdue");
  const today = rows.filter((r) => r.status === "today");
  const upcomingAll = rows.filter(
    (r) => r.daysUntilDue >= 1 && r.daysUntilDue <= upcomingDays
  );

  // 3) Sort each group by nextDueAt asc
  overdue.sort(byNextDueAsc);
  today.sort(byNextDueAsc);
  upcomingAll.sort(byNextDueAsc);

  // 4) Cap upcoming to the requested limit
  const upcoming = upcomingAll.slice(0, upcomingLimit);

  return { overdue, today, upcoming };
}

/* ========== Badge helper for UI ========== */

// generate a badge text for a contact
export function badgeText(c: Computed): string {
  // Short, human-friendly labels for cards or lists
  if (c.status === "overdue") return `Overdue by ${Math.abs(c.daysUntilDue)}d`;
  if (c.status === "today") return "Today";
  return `In ${c.daysUntilDue}d`;
}
