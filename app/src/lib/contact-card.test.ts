import { describe, expect, it } from "vitest";
import { contactCard, contactList } from "./contact-card";
import { computeStatus } from "./due";
import type { RosterContact } from "./roster";

const NOW = new Date("2026-03-27T12:00:00Z");

// A roster row as the roster would build it at `now`.
function row(p: Partial<RosterContact> = {}, now = NOW): RosterContact {
  const base = {
    id: "c1",
    name: "Sam",
    phone: null,
    category: "FRIEND" as const,
    intervalDays: 7,
    createdAt: new Date("2026-01-01T09:00:00Z"),
    lastContactedAt: null,
    lastReminderSentAt: null,
    isActive: true,
    notes: null,
    hasAiSummary: false,
    aiSummary: null,
    keyTopics: [],
    followUps: [],
    ...p,
  };
  return { ...base, ...computeStatus(base, now) };
}

describe("contactCard state", () => {
  it("is Due now when overdue or due today", () => {
    expect(contactCard(row({ lastContactedAt: new Date("2026-03-10T10:00:00Z") }), NOW).state).toBe("due");
    expect(contactCard(row({ lastContactedAt: new Date("2026-03-20T10:00:00Z") }), NOW).state).toBe("due");
  });

  it("is Up to date when not yet due", () => {
    expect(contactCard(row({ lastContactedAt: new Date("2026-03-25T10:00:00Z") }), NOW).state).toBe("upToDate");
  });

  it("is Paused whatever the due status", () => {
    expect(contactCard(row({ isActive: false, lastContactedAt: new Date("2026-03-10T10:00:00Z") }), NOW).state).toBe("paused");
    expect(contactCard(row({ isActive: false, lastContactedAt: new Date("2026-03-25T10:00:00Z") }), NOW).state).toBe("paused");
  });
});

describe("contactCard next-due label", () => {
  const nextDue = (p: Partial<RosterContact>) => contactCard(row(p), NOW).nextDue;

  it("says Now when overdue or due today", () => {
    expect(nextDue({ lastContactedAt: new Date("2026-03-10T10:00:00Z") })).toBe("Now");
    expect(nextDue({ lastContactedAt: new Date("2026-03-20T23:30:00Z") })).toBe("Now");
  });

  it("says Tomorrow, then In N days", () => {
    expect(nextDue({ lastContactedAt: new Date("2026-03-21T08:00:00Z") })).toBe("Tomorrow");
    expect(nextDue({ lastContactedAt: new Date("2026-03-25T08:00:00Z") })).toBe("In 5 days");
  });

  it("says Paused for a Paused Contact, even when overdue", () => {
    expect(nextDue({ isActive: false, lastContactedAt: new Date("2026-03-10T10:00:00Z") })).toBe("Paused");
  });
});

describe("contactCard last talked", () => {
  it("reads Last talked on… long and Last talked… short", () => {
    const card = contactCard(row({ lastContactedAt: new Date("2026-03-20T10:00:00Z") }), NOW);
    expect(card.lastTalked).toBe("Last talked on 20 March");
    expect(card.lastTalkedShort).toBe("Last talked 20 March");
  });

  it("reads Added on… when never Touched", () => {
    const card = contactCard(row({ createdAt: new Date("2026-02-03T09:00:00Z") }), NOW);
    expect(card.lastTalked).toBe("Added on 3 February");
    expect(card.lastTalkedShort).toBe("Added 3 February");
  });

  it("shows the year only for another year", () => {
    const card = contactCard(row({ lastContactedAt: new Date("2025-05-03T10:00:00Z") }), NOW);
    expect(card.lastTalked).toBe("Last talked on 3 May 2025");
  });

  it("goes by UTC day: 23:30 and 00:30 UTC the next day are different days", () => {
    expect(contactCard(row({ lastContactedAt: new Date("2026-03-19T23:30:00Z") }), NOW).lastTalked).toBe(
      "Last talked on 19 March"
    );
    expect(contactCard(row({ lastContactedAt: new Date("2026-03-20T00:30:00Z") }), NOW).lastTalked).toBe(
      "Last talked on 20 March"
    );
  });
});

describe("contactCard Interval", () => {
  it("reads Every day for one day, Every N days otherwise", () => {
    expect(contactCard(row({ intervalDays: 1 }), NOW).every).toBe("Every day");
    expect(contactCard(row({ intervalDays: 7 }), NOW).every).toBe("Every 7 days");
  });
});

describe("contactCard next-call prompts", () => {
  const nextCall = (p: Partial<RosterContact>) => contactCard(row(p), NOW).nextCall;

  it("shows follow-ups first, even when there are key topics", () => {
    expect(nextCall({ followUps: ["How was Lisbon?"], keyTopics: ["Running"] })).toEqual(["How was Lisbon?"]);
  });

  it("falls back to key topics without follow-ups", () => {
    expect(nextCall({ keyTopics: ["Running", "New job"] })).toEqual(["Running", "New job"]);
  });

  it("shows at most three", () => {
    expect(nextCall({ followUps: ["a", "b", "c", "d"] })).toEqual(["a", "b", "c"]);
  });

  it("is empty without Relationship memory", () => {
    expect(nextCall({})).toEqual([]);
  });
});

describe("contactList", () => {
  it("keeps active Contacts in roster due order and lists Paused ones after", () => {
    // Roster order: due order, whatever Paused says.
    const people = [
      row({ id: "paused-overdue", isActive: false, lastContactedAt: new Date("2026-03-01T10:00:00Z") }),
      row({ id: "overdue", lastContactedAt: new Date("2026-03-10T10:00:00Z") }),
      row({ id: "paused-ok", isActive: false, lastContactedAt: new Date("2026-03-25T10:00:00Z") }),
      row({ id: "today", lastContactedAt: new Date("2026-03-20T10:00:00Z") }),
      row({ id: "ok", lastContactedAt: new Date("2026-03-25T10:00:00Z") }),
    ];
    expect(contactList(people, NOW).map((c) => c.id)).toEqual([
      "overdue",
      "today",
      "ok",
      "paused-overdue",
      "paused-ok",
    ]);
  });

  it("gives each Contact its card", () => {
    const [card] = contactList([row({ isActive: false })], NOW);
    expect(card.state).toBe("paused");
    expect(card.nextDue).toBe("Paused");
  });
});
