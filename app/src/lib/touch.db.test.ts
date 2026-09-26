import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { roster } from "./roster";
import { fakeRelationshipMemory } from "@/test/fake-relationship-memory";
import { contactsOf } from "./contacts-of";
import { readStoredAiMemory } from "./contact";
import { recordTouch, undoTouch } from "./touch";

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

    const [touch] = await prisma.interaction.findMany({ where: { contactId: friend.id } });
    expect(result).toEqual({
      id: friend.id,
      lastContactedAt: NOW,
      undo: touch.id,
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

  it("saves a touch without a note as an Interaction with no note and the last touch before it", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");

    await recordTouch({ userId: alice.id, contactId: friend.id, note: "", now: NOW });

    const interactions = await prisma.interaction.findMany({ where: { contactId: friend.id } });
    expect(interactions).toMatchObject([{ note: null, notedAt: NOW, previousContactedAt: daysAgo(10) }]);
    expect((await contactsOf(alice.id).view(friend.id, NOW))?.interactions).toEqual([]);
  });

  it("treats a blank note as a touch without a note", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");

    await recordTouch({ userId: alice.id, contactId: friend.id, note: " \n  ", now: NOW });

    const interactions = await prisma.interaction.findMany({ where: { contactId: friend.id } });
    expect(interactions).toMatchObject([{ note: null, notedAt: NOW }]);
    expect((await contactsOf(alice.id).view(friend.id, NOW))?.interactions).toEqual([]);
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

  it("gives the AI the contact and its earlier notes, newest first, leaving out touches without a note", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await prisma.contact.create({
      data: { userId: alice.id, name: "Sam", category: "WORK", intervalDays: 7 },
    });
    await prisma.interaction.create({ data: { contactId: friend.id, note: "Met at conference", notedAt: daysAgo(20) } });
    await prisma.interaction.create({ data: { contactId: friend.id, note: "Lunch", notedAt: daysAgo(5) } });
    await recordTouch({ userId: alice.id, contactId: friend.id, note: "  ", now: daysAgo(2) });
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

describe("undoTouch", () => {
  const LATER = new Date(NOW.getTime() + 60_000);

  it("puts the last touch back and drops the touch and the note saved with it", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    await prisma.interaction.create({ data: { contactId: friend.id, note: "Earlier note", notedAt: daysAgo(10) } });
    const touch = await recordTouch({ userId: alice.id, contactId: friend.id, note: "Oops", now: NOW });

    const undone = await undoTouch({ userId: alice.id, undo: touch!.undo });

    expect(undone).toBe("undone");
    const [listed] = await roster(alice.id, NOW);
    expect(listed).toMatchObject({ lastContactedAt: daysAgo(10), status: "overdue" });
    const notes = await prisma.interaction.findMany({ where: { contactId: friend.id } });
    expect(notes.map((n) => n.note)).toEqual(["Earlier note"]);
  });

  it("restores a contact that had never been touched, after a touch without a note", async () => {
    const alice = await createUser("alice@example.com");
    const fresh = await prisma.contact.create({ data: { userId: alice.id, name: "Fresh", intervalDays: 7 } });
    const touch = await recordTouch({ userId: alice.id, contactId: fresh.id, note: "", now: NOW });

    expect(await undoTouch({ userId: alice.id, undo: touch!.undo })).toBe("undone");

    const [listed] = await roster(alice.id, NOW);
    expect(listed.lastContactedAt).toBeNull();
    expect(await prisma.interaction.count()).toBe(0);
  });

  it("changes nothing once the contact was touched again", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    const first = await recordTouch({ userId: alice.id, contactId: friend.id, note: "First", now: NOW });
    await recordTouch({ userId: alice.id, contactId: friend.id, note: "Second", now: LATER });

    expect(await undoTouch({ userId: alice.id, undo: first!.undo })).toBe("touched_again");

    const [listed] = await roster(alice.id, LATER);
    expect(listed.lastContactedAt).toEqual(LATER);
    expect((await contactsOf(alice.id).recentNotes(friend.id, 10))?.map((n) => n.note)).toEqual(["Second", "First"]);
  });

  it("can't undo another user's touch, and changes nothing", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    const bobsFriend = await createContact(bob.id, "Bob's friend");
    const touch = await recordTouch({ userId: bob.id, contactId: bobsFriend.id, note: "Private", now: NOW });

    expect(await undoTouch({ userId: alice.id, undo: touch!.undo })).toBe("not_found");

    const [listed] = await roster(bob.id, NOW);
    expect(listed.lastContactedAt).toEqual(NOW);
    expect((await contactsOf(bob.id).recentNotes(bobsFriend.id, 10))?.map((n) => n.note)).toEqual(["Private"]);
  });

  it("finds nothing to undo for an unknown value", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    await recordTouch({ userId: alice.id, contactId: friend.id, note: "", now: NOW });

    expect(await undoTouch({ userId: alice.id, undo: "no-such-touch" })).toBe("not_found");

    const [listed] = await roster(alice.id, NOW);
    expect(listed.lastContactedAt).toEqual(NOW);
  });

  it("drops only its own touch when another note has the same time", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    await prisma.interaction.create({ data: { contactId: friend.id, note: "Same time", notedAt: NOW } });
    const touch = await recordTouch({ userId: alice.id, contactId: friend.id, note: "Oops", now: NOW });

    expect(await undoTouch({ userId: alice.id, undo: touch!.undo })).toBe("undone");

    expect((await contactsOf(alice.id).recentNotes(friend.id, 10))?.map((n) => n.note)).toEqual(["Same time"]);
  });

  it("keeps the relationship memory learned from the note", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    const memory = fakeRelationshipMemory({
      result: { summary: "Started a new job at Acme.", keyTopics: ["new job"], followUps: ["How is Acme?"] },
    });
    const touch = await recordTouch({ userId: alice.id, contactId: friend.id, note: "New job", now: NOW, memory });

    await undoTouch({ userId: alice.id, undo: touch!.undo });

    const stored = readStoredAiMemory((await contactsOf(alice.id).get(friend.id))!);
    expect(stored).toEqual({ aiSummary: "Started a new job at Acme.", keyTopics: ["new job"], followUps: ["How is Acme?"] });
  });
});
