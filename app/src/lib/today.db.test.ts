import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { saveSettings, getSettings } from "./settings";
import { today } from "./today";

const NOW = new Date("2026-03-10T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

async function createUser(email: string) {
  return prisma.user.create({ data: { email } });
}

/** A weekly contact last Touched `lastTouchDaysAgo` days before NOW. */
async function createContact(
  userId: string,
  name: string,
  lastTouchDaysAgo: number,
  extra: { isActive?: boolean } = {}
) {
  return prisma.contact.create({
    data: { userId, name, intervalDays: 7, lastContactedAt: daysAgo(lastTouchDaysAgo), ...extra },
  });
}

async function setDailyGoal(userId: string, dailyGoal: number) {
  await saveSettings(userId, { ...(await getSettings(userId)), dailyGoal });
}

const names = (items: { name: string }[]) => items.map((i) => i.name);

describe("today", () => {
  it("suggests the first three due Contacts by default and lists the rest, in due order", async () => {
    const alice = await createUser("alice@example.com");
    await createContact(alice.id, "Overdue 1d", 8);
    await createContact(alice.id, "Due today", 7);
    await createContact(alice.id, "Overdue 20d", 27);
    await createContact(alice.id, "Overdue 5d", 12);
    await createContact(alice.id, "Overdue 3d", 10);
    await createContact(alice.id, "Not due", 2);

    const view = await today(alice.id, NOW);

    expect(view.dailyGoal).toBe(3);
    expect(names(view.suggested)).toEqual(["Overdue 20d", "Overdue 5d", "Overdue 3d"]);
    expect(names(view.others)).toEqual(["Overdue 1d", "Due today"]);
    expect(view.doneToday).toBe(0);
    expect(view.hasContacts).toBe(true);
  });

  it("follows the user's Daily goal", async () => {
    const alice = await createUser("alice@example.com");
    await setDailyGoal(alice.id, 1);
    await createContact(alice.id, "First", 20);
    await createContact(alice.id, "Second", 10);

    const view = await today(alice.id, NOW);

    expect(names(view.suggested)).toEqual(["First"]);
    expect(names(view.others)).toEqual(["Second"]);
  });

  it("suggests fewer as the user Touches people today, and none once the goal is met", async () => {
    const alice = await createUser("alice@example.com");
    await createContact(alice.id, "Talked this morning", 0);
    await createContact(alice.id, "A", 20);
    await createContact(alice.id, "B", 15);
    await createContact(alice.id, "C", 10);

    const oneDone = await today(alice.id, NOW);
    expect(oneDone.doneToday).toBe(1);
    expect(names(oneDone.suggested)).toEqual(["A", "B"]);
    expect(names(oneDone.others)).toEqual(["C"]);

    await prisma.contact.updateMany({ where: { name: { in: ["A", "B"] } }, data: { lastContactedAt: NOW } });
    const goalMet = await today(alice.id, NOW);
    expect(goalMet.doneToday).toBe(3);
    expect(goalMet.suggested).toEqual([]);
    expect(names(goalMet.others)).toEqual(["C"]);
  });

  it("leaves out Paused Contacts and other users' Contacts", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    await createContact(alice.id, "Paused", 30, { isActive: false });
    await createContact(bob.id, "Bob's friend", 30);

    const view = await today(alice.id, NOW);

    expect(view.suggested).toEqual([]);
    expect(view.others).toEqual([]);
    expect(view.hasContacts).toBe(false);
  });

  it("carries each Contact's Relationship memory", async () => {
    const alice = await createUser("alice@example.com");
    const noa = await createContact(alice.id, "Noa", 20);
    await prisma.contact.update({
      where: { id: noa.id },
      data: { aiSummary: "Moved to Florentine.", keyTopics: '["New apartment"]', followUps: '["Did she get the job?"]' },
    });

    const [first] = (await today(alice.id, NOW)).suggested;

    expect(first).toMatchObject({
      aiSummary: "Moved to Florentine.",
      keyTopics: ["New apartment"],
      followUps: ["Did she get the job?"],
    });
  });
});
