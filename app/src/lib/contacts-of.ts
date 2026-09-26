/**
 * Per-user Contact module: the only way to read or change a single contact
 * and its Interactions (the notes saved with Touches). Every method is scoped
 * to one user. A contact that doesn't exist and a contact owned by someone
 * else both come back as `null`, so callers can't tell them apart and can't
 * reach another user's row.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { asCategory, type Category } from "./contact";
import { toRosterContact, type RosterContact } from "./roster";
import { defaultIntervalFor, getSettings } from "./settings";

/** `intervalDays: null` means "use this user's default for the category". */
type Interval = { intervalDays?: number | null };

export type NewContact = {
  name: string;
  phone: string | null;
  category: Category;
  isActive: boolean;
} & Interval;

export type ContactChanges = Omit<
  Prisma.ContactUpdateInput,
  "user" | "interactions" | "intervalDays" | "category"
> & { category?: Category } & Interval;

/** A saved note from a Touch, as shown in a contact's notes timeline. */
export type ContactInteraction = { id: string; note: string; notedAt: Date };

/** One contact as the app sees it: its roster row plus its notes, newest first. */
export type ContactView = RosterContact & { interactions: ContactInteraction[] };

export function contactsOf(userId: string) {
  // Ownership check: load by id AND userId; "not found" means "not owned".
  const owned = (id: string) => prisma.contact.findFirst({ where: { id, userId } });

  async function resolveInterval(intervalDays: number | null | undefined, category: Category) {
    if (intervalDays !== null) return intervalDays;
    return defaultIntervalFor(category, await getSettings(userId));
  }

  // A contact's notes, newest first, trimmed, blank ones left out.
  async function notesOf(contactId: string, take?: number): Promise<ContactInteraction[]> {
    const stored = await prisma.interaction.findMany({
      where: { contactId },
      orderBy: { notedAt: "desc" },
      take,
    });
    return stored.flatMap(({ id, note, notedAt }) =>
      note?.trim() ? [{ id, note: note.trim(), notedAt }] : []
    );
  }

  return {
    get: owned,

    /** One contact as the app sees it at `now`; blank notes are left out. */
    async view(id: string, now: Date): Promise<ContactView | null> {
      const contact = await owned(id);
      if (!contact) return null;
      return { ...toRosterContact(contact, now), interactions: await notesOf(contact.id) };
    },

    /** The contact's `count` most recent notes, newest first. */
    async recentNotes(id: string, count: number) {
      if (!(await owned(id))) return null;
      return notesOf(id, count);
    },

    /** Save a note on the contact, dated `at`. */
    async saveNote(id: string, note: string, at: Date): Promise<ContactInteraction | null> {
      if (!(await owned(id))) return null;
      const saved = await prisma.interaction.create({ data: { contactId: id, note, notedAt: at } });
      return { id: saved.id, note, notedAt: saved.notedAt };
    },

    /** Drop the note saved on the contact at `at` (the Undo of a Touch). */
    async dropNote(id: string, at: Date) {
      if (!(await owned(id))) return null;
      await prisma.interaction.deleteMany({ where: { contactId: id, notedAt: at } });
      return true;
    },

    async create(contact: NewContact) {
      const intervalDays = await resolveInterval(contact.intervalDays ?? null, contact.category);
      return prisma.contact.create({ data: { ...contact, intervalDays, userId } });
    },

    async update(id: string, changes: ContactChanges) {
      const existing = await owned(id);
      if (!existing) return null;
      const category = changes.category ?? asCategory(existing.category);
      const intervalDays = await resolveInterval(changes.intervalDays, category);
      return prisma.contact.update({ where: { id }, data: { ...changes, intervalDays } });
    },

    async remove(id: string) {
      if (!(await owned(id))) return null;
      return prisma.contact.delete({ where: { id } });
    },
  };
}
