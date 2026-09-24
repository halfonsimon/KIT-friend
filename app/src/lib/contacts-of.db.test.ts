import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { contactsOf } from "./contacts-of";

async function createUser(email: string) {
  return prisma.user.create({ data: { email } });
}

async function createContact(userId: string, name: string) {
  return prisma.contact.create({ data: { userId, name, intervalDays: 7 } });
}

describe("contactsOf", () => {
  it("gets the user's own contact", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Alice's friend");

    const contact = await contactsOf(alice.id).get(friend.id);

    expect(contact?.name).toBe("Alice's friend");
  });

  it("can't get, update or remove another user's contact", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    const bobsFriend = await createContact(bob.id, "Bob's friend");
    const alices = contactsOf(alice.id);

    expect(await alices.get(bobsFriend.id)).toBeNull();
    expect(await alices.update(bobsFriend.id, { name: "Hijacked" })).toBeNull();
    expect(await alices.remove(bobsFriend.id)).toBeNull();

    expect(await contactsOf(bob.id).get(bobsFriend.id)).toMatchObject({ name: "Bob's friend" });
  });

  it("returns null for a contact that doesn't exist", async () => {
    const alice = await createUser("alice@example.com");

    expect(await contactsOf(alice.id).get("missing")).toBeNull();
  });

  it("updates only the given contact", async () => {
    const alice = await createUser("alice@example.com");
    const first = await createContact(alice.id, "First");
    const second = await createContact(alice.id, "Second");

    const updated = await contactsOf(alice.id).update(first.id, { name: "Renamed", intervalDays: 3 });

    expect(updated).toMatchObject({ name: "Renamed", intervalDays: 3 });
    expect(await contactsOf(alice.id).get(second.id)).toMatchObject({ name: "Second", intervalDays: 7 });
  });

  it("creates a contact with the user's default interval for its category when none is given", async () => {
    const alice = await createUser("alice@example.com");
    await prisma.setting.create({ data: { userId: alice.id, defaultWorkDays: 10 } });

    const created = await contactsOf(alice.id).create({
      name: "Colleague",
      phone: null,
      category: "WORK",
      intervalDays: null,
      isActive: true,
    });

    expect(created).toMatchObject({ name: "Colleague", intervalDays: 10, userId: alice.id });
  });

  it("falls back to the built-in default interval when the user has no settings", async () => {
    const alice = await createUser("alice@example.com");

    const created = await contactsOf(alice.id).create({
      name: "Cousin",
      phone: null,
      category: "FAMILY",
      intervalDays: null,
      isActive: true,
    });

    expect(created.intervalDays).toBe(7);
  });

  it("keeps an explicit interval", async () => {
    const alice = await createUser("alice@example.com");

    const created = await contactsOf(alice.id).create({
      name: "Friend",
      phone: null,
      category: "FRIEND",
      intervalDays: 45,
      isActive: true,
    });

    expect(created.intervalDays).toBe(45);
  });

  it("resets an updated contact to the default interval for its new category", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");

    const updated = await contactsOf(alice.id).update(friend.id, { category: "WORK", intervalDays: null });

    expect(updated?.intervalDays).toBe(14);
  });

  it("removes a contact together with its interactions", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    await prisma.interaction.create({ data: { contactId: friend.id, note: "Coffee" } });

    const removed = await contactsOf(alice.id).remove(friend.id);

    expect(removed?.id).toBe(friend.id);
    expect(await contactsOf(alice.id).get(friend.id)).toBeNull();
    expect(await prisma.interaction.count()).toBe(0);
  });
});
