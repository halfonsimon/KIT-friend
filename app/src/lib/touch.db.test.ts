import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { roster } from "./roster";
import { fakeRelationshipMemory } from "@/test/fake-relationship-memory";
import { contactsOf } from "./contacts-of";
import { readStoredAiMemory } from "./contact";
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

  it("updates the contact's relationship memory from the note", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    const memory = fakeRelationshipMemory({
      result: { summary: "Started a new job at Acme.", keyTopics: ["new job"], followUps: ["How is Acme?"] },
    });

    await recordTouch({ userId: alice.id, contactId: friend.id, note: "New job at Acme", now: NOW, memory });

    const stored = readStoredAiMemory((await contactsOf(alice.id).get(friend.id))!);
    expect(stored).toEqual({ aiSummary: "Started a new job at Acme.", keyTopics: ["new job"], followUps: ["How is Acme?"] });
  });

  it("keeps the existing relationship memory when the AI fails, but still records the touch", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await prisma.contact.create({
      data: {
        userId: alice.id,
        name: "Friend",
        intervalDays: 7,
        aiSummary: "Loves climbing.",
        keyTopics: JSON.stringify(["climbing"]),
        followUps: JSON.stringify(["Been climbing lately?"]),
      },
    });

    const result = await recordTouch({
      userId: alice.id,
      contactId: friend.id,
      note: "Hurt her ankle",
      now: NOW,
      memory: fakeRelationshipMemory({ fail: true }),
    });

    expect(result?.lastContactedAt).toEqual(NOW);
    expect(await prisma.interaction.count()).toBe(1);
    const stored = readStoredAiMemory((await contactsOf(alice.id).get(friend.id))!);
    expect(stored).toEqual({ aiSummary: "Loves climbing.", keyTopics: ["climbing"], followUps: ["Been climbing lately?"] });
  });

  it("leaves relationship memory alone when there is no memory adapter", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");

    await recordTouch({ userId: alice.id, contactId: friend.id, note: "Coffee", now: NOW });

    expect((await contactsOf(alice.id).get(friend.id))?.aiSummary).toBeNull();
  });

  it("doesn't ask the AI anything for a touch without a note", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    const memory = fakeRelationshipMemory();

    await recordTouch({ userId: alice.id, contactId: friend.id, note: "", now: NOW, memory });

    expect(memory.calls).toEqual([]);
  });

  it("gives the AI the contact and its earlier notes, newest first", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await prisma.contact.create({
      data: { userId: alice.id, name: "Sam", category: "WORK", intervalDays: 7 },
    });
    await prisma.interaction.create({ data: { contactId: friend.id, note: "Met at conference", notedAt: daysAgo(20) } });
    await prisma.interaction.create({ data: { contactId: friend.id, note: "Lunch", notedAt: daysAgo(5) } });
    const memory = fakeRelationshipMemory();

    await recordTouch({ userId: alice.id, contactId: friend.id, note: "Got promoted", now: NOW, memory });

    expect(memory.calls).toHaveLength(1);
    expect(memory.calls[0].note).toBe("Got promoted");
    expect(memory.calls[0].context).toMatchObject({
      name: "Sam",
      category: "WORK",
      recentInteractions: [
        { note: "Lunch", date: daysAgo(5) },
        { note: "Met at conference", date: daysAgo(20) },
      ],
    });
  });

  it("runs the memory update through defer", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    const deferred: (() => Promise<void>)[] = [];

    await recordTouch({
      userId: alice.id,
      contactId: friend.id,
      note: "Coffee",
      now: NOW,
      memory: fakeRelationshipMemory({ result: { summary: "Likes coffee.", keyTopics: [], followUps: [] } }),
      defer: (task) => {
        deferred.push(task);
      },
    });

    expect((await contactsOf(alice.id).get(friend.id))?.aiSummary).toBeNull();
    await deferred[0]();
    expect((await contactsOf(alice.id).get(friend.id))?.aiSummary).toBe("Likes coffee.");
  });

  it("skips the memory update quietly if the contact was deleted in the meantime", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    const deferred: (() => Promise<void>)[] = [];

    await recordTouch({
      userId: alice.id,
      contactId: friend.id,
      note: "Coffee",
      now: NOW,
      memory: fakeRelationshipMemory(),
      defer: (task) => {
        deferred.push(task);
      },
    });
    await contactsOf(alice.id).remove(friend.id);

    await expect(deferred[0]()).resolves.toBeUndefined();
    expect(await prisma.contact.count()).toBe(0);
  });
});
