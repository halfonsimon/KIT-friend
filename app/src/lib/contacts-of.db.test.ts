import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { CATEGORY_VALUES } from "./contact";
import { contactsOf } from "./contacts-of";
import { roster } from "./roster";

const NOW = new Date("2026-03-10T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

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

describe("contactsOf(...).view", () => {
  it("shows a contact with the same row and due status as the roster at the same now", async () => {
    const alice = await createUser("alice@example.com");
    const overdue = await prisma.contact.create({
      data: { userId: alice.id, name: "Overdue", intervalDays: 7, lastContactedAt: daysAgo(9) },
    });
    const today = await prisma.contact.create({
      data: { userId: alice.id, name: "Today", intervalDays: 7, lastContactedAt: daysAgo(7) },
    });
    const ok = await prisma.contact.create({
      data: { userId: alice.id, name: "Ok", intervalDays: 7, lastContactedAt: daysAgo(2) },
    });
    const alices = contactsOf(alice.id);

    const views = [await alices.view(overdue.id, NOW), await alices.view(today.id, NOW), await alices.view(ok.id, NOW)];

    expect(views.map((v) => [v?.status, v?.daysUntilDue])).toEqual([
      ["overdue", -2],
      ["today", 0],
      ["ok", 5],
    ]);
    const rows = await roster(alice.id, NOW);
    for (const view of views) {
      const { interactions, ...row } = view!;
      expect(interactions).toEqual([]);
      expect(row).toEqual(rows.find((r) => r.id === row.id));
    }
  });

  it("shows the contact's notes newest first, trimmed, with blank notes left out", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    const other = await createContact(alice.id, "Other");
    await prisma.interaction.createMany({
      data: [
        { contactId: friend.id, note: "Oldest", notedAt: daysAgo(20) },
        { contactId: friend.id, note: "  Newest  ", notedAt: daysAgo(1) },
        { contactId: friend.id, note: "   ", notedAt: daysAgo(2) },
        { contactId: friend.id, note: null, notedAt: daysAgo(3) },
        { contactId: friend.id, note: "Middle", notedAt: daysAgo(10) },
        { contactId: other.id, note: "Someone else's", notedAt: daysAgo(5) },
      ],
    });

    const view = await contactsOf(alice.id).view(friend.id, NOW);

    expect(view?.interactions.map((i) => [i.note, i.notedAt])).toEqual([
      ["Newest", daysAgo(1)],
      ["Middle", daysAgo(10)],
      ["Oldest", daysAgo(20)],
    ]);
  });

  it("shows parsed relationship memory, with malformed stored lists read as empty", async () => {
    const alice = await createUser("alice@example.com");
    const remembered = await prisma.contact.create({
      data: {
        userId: alice.id,
        name: "Remembered",
        intervalDays: 7,
        aiSummary: "Loves hiking.",
        keyTopics: JSON.stringify(["Hiking", "New job"]),
        followUps: JSON.stringify(["How was the trail?"]),
      },
    });
    const garbled = await prisma.contact.create({
      data: { userId: alice.id, name: "Garbled", intervalDays: 7, keyTopics: "not json", followUps: "{\"a\":1}" },
    });
    const alices = contactsOf(alice.id);

    expect(await alices.view(remembered.id, NOW)).toMatchObject({
      aiSummary: "Loves hiking.",
      hasAiSummary: true,
      keyTopics: ["Hiking", "New job"],
      followUps: ["How was the trail?"],
    });
    expect(await alices.view(garbled.id, NOW)).toMatchObject({
      aiSummary: null,
      hasAiSummary: false,
      keyTopics: [],
      followUps: [],
    });
  });

  it("returns null for another user's contact and for a missing one", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    const bobsFriend = await createContact(bob.id, "Bob's friend");
    await prisma.interaction.create({ data: { contactId: bobsFriend.id, note: "Private" } });

    expect(await contactsOf(alice.id).view(bobsFriend.id, NOW)).toBeNull();
    expect(await contactsOf(alice.id).view("missing", NOW)).toBeNull();
  });

  it("shows a paused contact with its notes and relationship memory", async () => {
    const alice = await createUser("alice@example.com");
    const paused = await prisma.contact.create({
      data: {
        userId: alice.id,
        name: "Paused",
        intervalDays: 7,
        isActive: false,
        lastContactedAt: daysAgo(30),
        aiSummary: "On sabbatical.",
      },
    });
    await prisma.interaction.create({ data: { contactId: paused.id, note: "Off to Peru", notedAt: daysAgo(30) } });

    const view = await contactsOf(alice.id).view(paused.id, NOW);

    expect(view).toMatchObject({ name: "Paused", isActive: false, status: "overdue", aiSummary: "On sabbatical." });
    expect(view?.interactions.map((i) => i.note)).toEqual(["Off to Peru"]);
  });
});

describe("contactsOf(...) notes", () => {
  it("saves a Touch with its note among the contact's recent notes", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    const alices = contactsOf(alice.id);

    const saved = await alices.saveTouch(friend.id, { note: "Coffee in the park", at: NOW });

    expect(saved?.contact.lastContactedAt).toEqual(NOW);
    expect(await alices.recentNotes(friend.id, 10)).toEqual([
      { id: saved?.touchId, note: "Coffee in the park", notedAt: NOW },
    ]);
  });

  it("saves a Touch without a note as an Interaction that remembers the last Touch before it", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await prisma.contact.create({
      data: { userId: alice.id, name: "Friend", intervalDays: 7, lastContactedAt: daysAgo(10) },
    });
    const alices = contactsOf(alice.id);

    const saved = await alices.saveTouch(friend.id, { note: null, at: NOW });

    expect(await prisma.interaction.findMany({ where: { contactId: friend.id } })).toMatchObject([
      { id: saved?.touchId, note: null, notedAt: NOW, previousContactedAt: daysAgo(10) },
    ]);
    expect(await alices.recentNotes(friend.id, 10)).toEqual([]);
    expect((await alices.view(friend.id, NOW))?.interactions).toEqual([]);
  });

  it("undoes only the given Touch, putting back the last Touch before it", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    const other = await createContact(alice.id, "Other");
    const alices = contactsOf(alice.id);
    await alices.saveTouch(friend.id, { note: "Earlier", at: daysAgo(3) });
    const oops = await alices.saveTouch(friend.id, { note: "Oops", at: NOW });
    await alices.saveTouch(other.id, { note: "Same time, other contact", at: NOW });

    expect(await alices.undoTouch(oops!.touchId)).toBe("undone");

    expect((await alices.get(friend.id))?.lastContactedAt).toEqual(daysAgo(3));
    expect((await alices.recentNotes(friend.id, 10))?.map((n) => n.note)).toEqual(["Earlier"]);
    expect((await alices.recentNotes(other.id, 10))?.map((n) => n.note)).toEqual(["Same time, other contact"]);
  });

  it("caps recent notes at the requested count, newest first", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    await prisma.interaction.createMany({
      data: [
        { contactId: friend.id, note: "Four days ago", notedAt: daysAgo(4) },
        { contactId: friend.id, note: "Yesterday", notedAt: daysAgo(1) },
        { contactId: friend.id, note: "Three days ago", notedAt: daysAgo(3) },
        { contactId: friend.id, note: "Two days ago", notedAt: daysAgo(2) },
      ],
    });

    const recent = await contactsOf(alice.id).recentNotes(friend.id, 3);

    expect(recent?.map((n) => n.note)).toEqual(["Yesterday", "Two days ago", "Three days ago"]);
  });

  it("counts only Touches with a note towards the cap", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    await prisma.interaction.createMany({
      data: [
        { contactId: friend.id, note: "Four days ago", notedAt: daysAgo(4) },
        { contactId: friend.id, note: "Three days ago", notedAt: daysAgo(3) },
        { contactId: friend.id, note: null, notedAt: daysAgo(2) },
        { contactId: friend.id, note: null, notedAt: daysAgo(1) },
      ],
    });

    const recent = await contactsOf(alice.id).recentNotes(friend.id, 2);

    expect(recent?.map((n) => n.note)).toEqual(["Three days ago", "Four days ago"]);
  });

  it("can't list notes on, save or undo a Touch on another user's contact", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    const bobsFriend = await createContact(bob.id, "Bob's friend");
    const bobs = await contactsOf(bob.id).saveTouch(bobsFriend.id, { note: "Private", at: daysAgo(1) });
    const alices = contactsOf(alice.id);

    expect(await alices.recentNotes(bobsFriend.id, 10)).toBeNull();
    expect(await alices.saveTouch(bobsFriend.id, { note: "Planted", at: NOW })).toBeNull();
    expect(await alices.undoTouch(bobs!.touchId)).toBe("not_found");

    expect((await contactsOf(bob.id).recentNotes(bobsFriend.id, 10))?.map((n) => n.note)).toEqual(["Private"]);
    expect((await contactsOf(bob.id).get(bobsFriend.id))?.lastContactedAt).toEqual(daysAgo(1));
  });
});

/** What the Contact form submits; `isActive` is sent only when the Contact isn't Paused. */
function contactForm(fields: Record<string, string>) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return form;
}

const pausedFriend = { name: "Ada", phone: "", category: "FRIEND", intervalDays: "" };
const newFriend = { ...pausedFriend, isActive: "on" };

describe("contactsOf(...) form input", () => {
  it("creates a contact with the user's Category default when the Interval is blank", async () => {
    const alice = await createUser("alice@example.com");
    await prisma.setting.create({ data: { userId: alice.id, defaultWorkDays: 10 } });

    const result = await contactsOf(alice.id).createFromForm(
      contactForm({ ...newFriend, category: "WORK", intervalDays: "  " })
    );

    expect(result).toMatchObject({ ok: true, contact: { name: "Ada", category: "WORK", intervalDays: 10 } });
  });

  it("creates a contact with the built-in Category default when the user has no Settings", async () => {
    const alice = await createUser("alice@example.com");

    const result = await contactsOf(alice.id).createFromForm(contactForm({ ...newFriend, category: "FAMILY" }));

    expect(result).toMatchObject({ ok: true, contact: { intervalDays: 7 } });
  });

  it("keeps a typed Interval, and a new contact is always active", async () => {
    const alice = await createUser("alice@example.com");

    const result = await contactsOf(alice.id).createFromForm(contactForm({ ...pausedFriend, intervalDays: " 45 " }));

    expect(result).toMatchObject({ ok: true, contact: { intervalDays: 45, isActive: true } });
  });

  it("pauses a contact when the form leaves out the active field, and reactivates it when present", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    const alices = contactsOf(alice.id);

    expect(await alices.updateFromForm(friend.id, contactForm(pausedFriend))).toMatchObject({
      ok: true,
      contact: { isActive: false },
    });
    expect(await alices.updateFromForm(friend.id, contactForm(newFriend))).toMatchObject({
      ok: true,
      contact: { isActive: true },
    });
  });

  it("switches a blank Interval to the current default for the contact's new Category", async () => {
    const alice = await createUser("alice@example.com");
    await prisma.setting.create({ data: { userId: alice.id, defaultWorkDays: 10 } });
    const friend = await prisma.contact.create({
      data: { userId: alice.id, name: "Friend", category: "FRIEND", intervalDays: 45 },
    });

    const result = await contactsOf(alice.id).updateFromForm(
      friend.id,
      contactForm({ ...newFriend, category: "WORK", intervalDays: "" })
    );

    expect(result).toMatchObject({ ok: true, contact: { category: "WORK", intervalDays: 10 } });
  });

  it.each([
    ["0", "Must be between 1 and 365 days"],
    ["366", "Must be between 1 and 365 days"],
    ["2.5", "Use whole days"],
    ["abc", "Enter a number of days"],
  ])("rejects the Interval %s with %j and saves nothing", async (intervalDays, message) => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    const alices = contactsOf(alice.id);

    const created = await alices.createFromForm(contactForm({ ...newFriend, intervalDays }));
    const updated = await alices.updateFromForm(friend.id, contactForm({ ...newFriend, intervalDays }));

    expect(created).toEqual({ ok: false, fieldErrors: { intervalDays: message } });
    expect(updated).toEqual({ ok: false, fieldErrors: { intervalDays: message } });
    expect(await prisma.contact.count()).toBe(1);
    expect(await alices.get(friend.id)).toMatchObject({ name: "Friend", intervalDays: 7 });
  });

  it("names every invalid field with one message each, and saves nothing", async () => {
    const alice = await createUser("alice@example.com");
    const friend = await createContact(alice.id, "Friend");
    const alices = contactsOf(alice.id);
    const invalid = contactForm({ ...newFriend, name: "   ", category: "ENEMY", intervalDays: "-3" });

    const expected = {
      ok: false,
      fieldErrors: {
        name: "Name is required",
        category: "Choose a category",
        intervalDays: "Must be between 1 and 365 days",
      },
    };
    expect(await alices.createFromForm(invalid)).toEqual(expected);
    expect(await alices.updateFromForm(friend.id, invalid)).toEqual(expected);
    expect(await prisma.contact.count()).toBe(1);
    expect(await alices.get(friend.id)).toMatchObject({ name: "Friend", category: "FRIEND" });
  });

  it("accepts every Category", async () => {
    const alice = await createUser("alice@example.com");

    for (const category of CATEGORY_VALUES) {
      expect(await contactsOf(alice.id).createFromForm(contactForm({ ...newFriend, category }))).toMatchObject({
        ok: true,
        contact: { category },
      });
    }
  });

  it("can't update another user's contact from the form, valid or not", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    const bobsFriend = await createContact(bob.id, "Bob's friend");
    const alices = contactsOf(alice.id);

    expect(await alices.updateFromForm(bobsFriend.id, contactForm({ ...newFriend, name: "Hijacked" }))).toBeNull();
    expect(await alices.updateFromForm(bobsFriend.id, contactForm({ ...newFriend, name: "" }))).toBeNull();
    expect(await alices.updateFromForm("missing", contactForm(newFriend))).toBeNull();

    expect(await contactsOf(bob.id).get(bobsFriend.id)).toMatchObject({ name: "Bob's friend", isActive: true });
  });

  it("trims the name and phone, and saves a blank phone as none", async () => {
    const alice = await createUser("alice@example.com");
    const alices = contactsOf(alice.id);

    const withPhone = await alices.createFromForm(contactForm({ ...newFriend, name: "  Ada  ", phone: " +33 6 12 " }));
    const withoutPhone = await alices.createFromForm(contactForm({ ...newFriend, phone: "   " }));

    expect(withPhone).toMatchObject({ ok: true, contact: { name: "Ada", phone: "+33 6 12" } });
    expect(withoutPhone).toMatchObject({ ok: true, contact: { phone: null } });
  });
});
