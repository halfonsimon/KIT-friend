/**
 * Per-user Contact module: the only way to read or change a single contact.
 * Every method is scoped to one user. A contact that doesn't exist and a
 * contact owned by someone else both come back as `null`, so callers can't
 * tell them apart and can't reach another user's row.
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

  return {
    get: owned,

    /** One contact as the app sees it at `now`; blank notes are left out. */
    async view(id: string, now: Date): Promise<ContactView | null> {
      const contact = await owned(id);
      if (!contact) return null;
      const stored = await prisma.interaction.findMany({
        where: { contactId: contact.id },
        orderBy: { notedAt: "desc" },
      });
      const interactions = stored.flatMap(({ id, note, notedAt }) =>
        note?.trim() ? [{ id, note: note.trim(), notedAt }] : []
      );
      return { ...toRosterContact(contact, now), interactions };
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
