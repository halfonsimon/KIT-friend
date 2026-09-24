import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { buildDigest } from "./digest";

const NOW = new Date("2026-03-10T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

async function createUser(email: string) {
  return prisma.user.create({ data: { email } });
}

async function createContact(userId: string, name: string, extra: { isActive?: boolean; lastContactedAt?: Date } = {}) {
  return prisma.contact.create({
    data: { userId, name, intervalDays: 7, lastContactedAt: daysAgo(10), ...extra },
  });
}

const names = (items: { name: string }[]) => items.map((i) => i.name);

describe("buildDigest", () => {
  it("contains only the user's own active contacts", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    await createContact(alice.id, "Alice's friend");
    await createContact(alice.id, "Alice's paused friend", { isActive: false });
    await createContact(bob.id, "Bob's friend");

    const digest = await buildDigest(alice.id, NOW);

    expect(names(digest.overdue)).toEqual(["Alice's friend"]);
    expect(digest.stats.total).toBe(1);
  });

  it("shows the default number of upcoming contacts when the user has no settings", async () => {
    const alice = await createUser("alice@example.com");
    for (const [name, lastContactedDaysAgo] of [["Due in 1d", 6], ["Due in 2d", 5], ["Due in 3d", 4]] as const) {
      await createContact(alice.id, name, { lastContactedAt: daysAgo(lastContactedDaysAgo) });
    }

    const digest = await buildDigest(alice.id, NOW);

    expect(names(digest.upcoming)).toEqual(["Due in 1d", "Due in 2d"]);
  });

  it("clamps a negative stored upcoming count to zero, like the settings page", async () => {
    const alice = await createUser("alice@example.com");
    await prisma.setting.create({ data: { userId: alice.id, upcomingCount: -3 } });
    for (let i = 1; i <= 4; i++) {
      await createContact(alice.id, `Due in ${i}d`, { lastContactedAt: daysAgo(7 - i) });
    }

    const digest = await buildDigest(alice.id, NOW);

    expect(digest.upcoming).toEqual([]);
  });
});
