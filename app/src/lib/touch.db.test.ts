import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { roster } from "./roster";
import { recordTouch } from "./touch";

const NOW = new Date("2026-03-10T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

async function createUser(email: string) {
  return prisma.user.create({ data: { email } });
}

async function createContact(userId: string, name: string) {
  return prisma.contact.create({
    data: { userId, name, intervalDays: 7, lastContactedAt: daysAgo(10) },
  });
}

describe("recordTouch", () => {
  it("marks the contact as contacted now and returns its new due status", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");

    const result = await recordTouch({ userId: alice.id, contactId: friend.id, note: "", now: NOW });

    expect(result).toEqual({
      id: friend.id,
      lastContactedAt: NOW,
      status: "ok",
      daysUntilDue: 7,
      nextDueAt: new Date("2026-03-17T00:00:00Z"),
    });
    const [listed] = await roster(alice.id, NOW);
    expect(listed).toMatchObject({ lastContactedAt: NOW, status: "ok", daysUntilDue: 7 });
  });

  it("saves a note as an Interaction dated now", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");

    await recordTouch({ userId: alice.id, contactId: friend.id, note: "  Talked about her new job  ", now: NOW });

    const interactions = await prisma.interaction.findMany({ where: { contactId: friend.id } });
    expect(interactions).toMatchObject([{ note: "Talked about her new job", notedAt: NOW }]);
  });

  it("treats a blank note as a touch without a note", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");

    await recordTouch({ userId: alice.id, contactId: friend.id, note: "   ", now: NOW });

    expect(await prisma.interaction.count()).toBe(0);
  });

  it("can't touch another user's contact", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    const bobsFriend = await createContact(bob.id, "Bob's friend");

    const result = await recordTouch({ userId: alice.id, contactId: bobsFriend.id, note: "Hi", now: NOW });

    expect(result).toBeNull();
    expect(await prisma.interaction.count()).toBe(0);
    const [listed] = await roster(bob.id, NOW);
    expect(listed.lastContactedAt).toEqual(daysAgo(10));
  });
});
