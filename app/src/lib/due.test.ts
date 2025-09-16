import { describe, it, expect } from "vitest";
import { computeStatus, groupForDigest, badgeText, type ContactLike, type Computed } from "./due";

const NOW = new Date("2025-09-16T12:00:00Z"); // midday to ignore time-of-day effects

const mk = (
  p: Partial<ContactLike> & Pick<ContactLike, "id" | "name">
): ContactLike => ({
  id: p.id,
  name: p.name,
  intervalDays: p.intervalDays ?? 30,
  createdAt: p.createdAt ?? "2025-09-10T00:00:00Z",
  lastContactedAt: p.lastContactedAt ?? null,
});

describe("computeStatus", () => {
  it("marks overdue / today / ok correctly (date-only UTC)", () => {
    const over = mk({
      id: "1",
      name: "Over",
      intervalDays: 7,
      createdAt: "2025-09-01",
      lastContactedAt: "2025-09-06T15:00:00Z",
    }); // due 13
    const today = mk({
      id: "2",
      name: "Today",
      intervalDays: 3,
      createdAt: "2025-09-10",
      lastContactedAt: "2025-09-13T23:59:00Z",
    }); // due 16
    const ok = mk({
      id: "3",
      name: "OK",
      intervalDays: 5,
      createdAt: "2025-09-14T08:00:00Z",
    }); // due 19

    const r1 = computeStatus(over, NOW);
    const r2 = computeStatus(today, NOW);
    const r3 = computeStatus(ok, NOW);

    expect(r1.status).toBe("overdue");
    expect(r1.daysUntilDue).toBeLessThan(0); // roughly -3

    expect(r2.status).toBe("today");
    expect(r2.daysUntilDue).toBe(0);

    expect(r3.status).toBe("ok");
    expect(r3.daysUntilDue).toBe(3);
  });

  it("uses lastContactedAt as anchor when present, else createdAt, else now", () => {
    // Anchor = lastContactedAt
    const a = mk({
      id: "a",
      name: "A",
      intervalDays: 1,
      createdAt: "2025-09-10",
      lastContactedAt: "2025-09-15T10:00:00Z",
    });
    expect(computeStatus(a, NOW).daysUntilDue).toBe(0); // 15 + 1 = 16 → today

    // Anchor = createdAt (no lastContactedAt)
    const b = mk({
      id: "b",
      name: "B",
      intervalDays: 2,
      createdAt: "2025-09-15",
    });
    expect(computeStatus(b, NOW).daysUntilDue).toBe(1); // 15 + 2 = 17 → in 1

    // Fallback = now (both missing/invalid)
    const c = {
      id: "c",
      name: "C",
      intervalDays: 2,
      createdAt: "",
    } as unknown as ContactLike;
    const r = computeStatus(c, NOW);
    expect(r.daysUntilDue).toBe(2); // now + 2 days
    expect(r.status).toBe("ok");
  });

  it("clamps intervalDays to at least 1", () => {
    const z = mk({
      id: "z",
      name: "Zero",
      intervalDays: 0,
      createdAt: "2025-09-16",
    });
    const n = mk({
      id: "n",
      name: "Neg",
      intervalDays: -5,
      createdAt: "2025-09-16",
    });
    expect(computeStatus(z, NOW).daysUntilDue).toBe(1);
    expect(computeStatus(n, NOW).daysUntilDue).toBe(1);
  });

  it("is stable regardless of time-of-day (date-only)", () => {
    const c = mk({
      id: "t",
      name: "Time",
      intervalDays: 0,
      createdAt: "2025-09-16T23:59:00Z",
    }); // clamp→1 day
    const morning = new Date("2025-09-16T01:00:00Z");
    const night = new Date("2025-09-16T23:59:00Z");
    expect(computeStatus(c, morning).daysUntilDue).toBe(1);
    expect(computeStatus(c, night).daysUntilDue).toBe(1);
  });

  it("throws error for invalid contact", () => {
    // Missing/empty id should throw (guard in computeStatus)
    expect(() => computeStatus({ id: "", name: "Bad" } as unknown as ContactLike)).toThrow(
      "Contact must have an id"
    );
  });
});

describe("groupForDigest", () => {
  it("groups as Overdue → Today → Upcoming (≤2), sorted by due date", () => {
    const contacts: ContactLike[] = [
      mk({
        id: "1",
        name: "Over",
        intervalDays: 7,
        createdAt: "2025-09-01",
        lastContactedAt: "2025-09-06",
      }), // due 13 → overdue
      mk({
        id: "2",
        name: "Today",
        intervalDays: 3,
        createdAt: "2025-09-10",
        lastContactedAt: "2025-09-13",
      }), // due 16 → today
      mk({ id: "3", name: "U3", intervalDays: 5, createdAt: "2025-09-14" }), // due 19 → in 3
      mk({ id: "4", name: "U1", intervalDays: 2, createdAt: "2025-09-15" }), // due 17 → in 1
      mk({ id: "5", name: "U2", intervalDays: 3, createdAt: "2025-09-15" }), // due 18 → in 2
    ];

    const g = groupForDigest(contacts, NOW);

    expect(g.overdue.map((x) => x.name)).toEqual(["Over"]); // all overdue
    expect(g.today.map((x) => x.name)).toEqual(["Today"]); // all today

    // upcoming sorted asc, capped at 2 → ["U1","U2"] (17th then 18th)
    expect(g.upcoming.map((x) => x.name)).toEqual(["U1", "U2"]);
  });
});

describe("badgeText", () => {
  it("formats badge text correctly", () => {
    const overdue: Computed = {
      status: "overdue",
      daysUntilDue: -3,
      nextDueAt: new Date("2025-09-10T00:00:00Z"),
    };
    const today: Computed = {
      status: "today",
      daysUntilDue: 0,
      nextDueAt: new Date("2025-09-16T00:00:00Z"),
    };
    const ok: Computed = {
      status: "ok",
      daysUntilDue: 2,
      nextDueAt: new Date("2025-09-18T00:00:00Z"),
    };

    expect(badgeText(overdue)).toBe("Overdue by 3d");
    expect(badgeText(today)).toBe("Today");
    expect(badgeText(ok)).toBe("In 2d");
  });
});
