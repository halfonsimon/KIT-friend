import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { roster } from "./roster";

const NOW = new Date("2026-03-10T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

async function createUser(email: string) {
  return prisma.user.create({ data: { email } });
}

async function createContact(
  userId: string,
  name: string,
  extra: { isActive?: boolean; lastContactedAt?: Date; intervalDays?: number } = {}
) {
  return prisma.contact.create({
    data: { userId, name, intervalDays: 7, lastContactedAt: daysAgo(0), ...extra },
  });
}

const names = (items: { name: string }[]) => items.map((i) => i.name);

describe("roster", () => {
  it("lists only the user's own contacts, overdue first, then today, then by due date", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    await createContact(alice.id, "Due in 3d", { lastContactedAt: daysAgo(4) });
    await createContact(alice.id, "Due today", { lastContactedAt: daysAgo(7) });
    await createContact(alice.id, "Overdue by 1d", { lastContactedAt: daysAgo(8) });
    await createContact(alice.id, "Due in 1d", { lastContactedAt: daysAgo(6) });
    await createContact(alice.id, "Overdue by 5d", { lastContactedAt: daysAgo(12) });
    await createContact(bob.id, "Bob's friend", { lastContactedAt: daysAgo(30) });

    const contacts = await roster(alice.id, NOW);

    expect(names(contacts)).toEqual(["Overdue by 5d", "Overdue by 1d", "Due today", "Due in 1d", "Due in 3d"]);
    expect(contacts.map((c) => [c.status, c.daysUntilDue])).toEqual([
      ["overdue", -5],
      ["overdue", -1],
      ["today", 0],
      ["ok", 1],
      ["ok", 3],
    ]);
  });

  it("includes inactive contacts unless asked for active ones only", async () => {
    const alice = await createUser("alice@example.com");
    await createContact(alice.id, "Active");
    await createContact(alice.id, "Paused", { isActive: false });

    expect(names(await roster(alice.id, NOW))).toEqual(["Active", "Paused"]);
    expect(names(await roster(alice.id, NOW, { activeOnly: true }))).toEqual(["Active"]);
  });

  it("counts whole UTC days, so a contact turns overdue at UTC midnight", async () => {
    const alice = await createUser("alice@example.com");
    await createContact(alice.id, "Friend", {
      intervalDays: 1,
      lastContactedAt: new Date("2026-03-09T23:30:00Z"),
    });

    const lateOnDueDay = await roster(alice.id, new Date("2026-03-10T23:59:00Z"));
    const justAfterMidnight = await roster(alice.id, new Date("2026-03-11T00:01:00Z"));

    expect(lateOnDueDay[0].status).toBe("today");
    expect(justAfterMidnight[0]).toMatchObject({ status: "overdue", daysUntilDue: -1 });
  });

  it("anchors on the creation date when a contact was never contacted", async () => {
    const alice = await createUser("alice@example.com");
    await prisma.contact.create({
      data: { userId: alice.id, name: "New", intervalDays: 7, createdAt: daysAgo(2) },
    });

    const [contact] = await roster(alice.id, NOW);

    expect(contact).toMatchObject({ status: "ok", daysUntilDue: 5, nextDueAt: new Date("2026-03-15T00:00:00Z") });
  });
});
