/**
 * Per-user Contact module: the only way to read or change a single contact
 * and its Interactions (its recorded Touches, with their notes). Every method is scoped
 * to one user. A contact that doesn't exist and a contact owned by someone
 * else both come back as `null`, so callers can't tell them apart and can't
 * reach another user's row.
 */
import type { Contact, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { asCategory, CATEGORY_VALUES, type Category } from "./contact";
import { fieldErrorsFrom, type FieldErrors } from "./field-errors";
import { IntervalDays } from "./interval";
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

/**
 * What the Contact form submits, as text. A blank Interval means "this user's
 * default for the Category". The form sends `isActive` only when the contact
 * isn't Paused, so a missing field means Paused.
 */
const ContactForm = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().transform((phone) => phone || null),
  category: z.enum(CATEGORY_VALUES, { error: "Choose a category" }),
  intervalDays: z
    .string()
    .trim()
    .transform((days) => (days === "" ? null : Number(days)))
    .pipe(IntervalDays.nullable()),
  isActive: z.boolean(),
});

function readContactForm(form: FormData) {
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  };
  return ContactForm.safeParse({
    name: text("name"),
    phone: text("phone"),
    category: text("category"),
    intervalDays: text("intervalDays"),
    isActive: form.has("isActive"),
  });
}

export type SaveContactResult = { ok: true; contact: Contact } | { ok: false; fieldErrors: FieldErrors };

/** A Touch's note, as shown in a contact's notes timeline. */
export type ContactInteraction = { id: string; note: string; notedAt: Date };

/** One contact as the app sees it: its roster row plus its notes, newest first. */
export type ContactView = RosterContact & { interactions: ContactInteraction[] };

export function contactsOf(userId: string) {
  // Ownership check: load by id AND userId; "not found" means "not owned".
  const owned = (id: string, db: Prisma.TransactionClient = prisma) =>
    db.contact.findFirst({ where: { id, userId } });

  async function resolveInterval(intervalDays: number | null | undefined, category: Category) {
    if (intervalDays !== null) return intervalDays;
    return defaultIntervalFor(category, await getSettings(userId));
  }

  // A contact's notes, newest first, trimmed; Touches without a note are left out.
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

  async function create(contact: NewContact) {
    const intervalDays = await resolveInterval(contact.intervalDays ?? null, contact.category);
    return prisma.contact.create({ data: { ...contact, intervalDays, userId } });
  }

  async function update(id: string, changes: ContactChanges) {
    const existing = await owned(id);
    if (!existing) return null;
    const category = changes.category ?? asCategory(existing.category);
    const intervalDays = await resolveInterval(changes.intervalDays, category);
    return prisma.contact.update({ where: { id }, data: { ...changes, intervalDays } });
  }

  return {
    get: (id: string) => owned(id),

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

    /**
     * Save a Touch at `at`: the contact's last Touch becomes `at`, and an
     * Interaction records the Touch, its note (if any) and the last Touch
     * before it (`previousContactedAt`). Both writes happen together.
     * `touchId` is the Interaction's id.
     */
    async saveTouch(id: string, touch: { note: string | null; at: Date }) {
      return prisma.$transaction(async (tx) => {
        const before = await owned(id, tx);
        if (!before) return null;
        const contact = await tx.contact.update({ where: { id }, data: { lastContactedAt: touch.at } });
        const saved = await tx.interaction.create({
          data: {
            contactId: id,
            note: touch.note,
            notedAt: touch.at,
            previousContactedAt: before.lastContactedAt,
          },
        });
        return { contact, touchId: saved.id };
      });
    },

    /**
     * Undo the Touch saved as `touchId`: if it is still the contact's latest
     * Touch, put the contact's last Touch back to the one before it and drop
     * that Touch with its note. The check and both writes happen together.
     */
    async undoTouch(touchId: string): Promise<"undone" | "not_found" | "touched_again"> {
      return prisma.$transaction(async (tx) => {
        // Ownership check through the contact: another user's Touch is "not found".
        const touch = await tx.interaction.findFirst({
          where: { id: touchId, contact: { userId } },
          include: { contact: true },
        });
        if (!touch) return "not_found";
        const { contact } = touch;
        if (contact.lastContactedAt?.getTime() !== touch.notedAt.getTime()) return "touched_again";
        await tx.contact.update({ where: { id: contact.id }, data: { lastContactedAt: touch.previousContactedAt } });
        await tx.interaction.delete({ where: { id: touch.id } });
        return "undone";
      });
    },

    create,

    /**
     * Create a contact from what the Contact form submits. A new contact is
     * always active. Invalid input comes back as field errors and nothing is saved.
     */
    async createFromForm(form: FormData): Promise<SaveContactResult> {
      const parsed = readContactForm(form);
      if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
      return { ok: true, contact: await create({ ...parsed.data, isActive: true }) };
    },

    update,

    /**
     * Update a contact from what the Contact form submits; `null` if it isn't
     * this user's. Invalid input comes back as field errors and nothing is saved.
     */
    async updateFromForm(id: string, form: FormData): Promise<SaveContactResult | null> {
      const parsed = readContactForm(form);
      if (parsed.success) {
        const contact = await update(id, parsed.data);
        return contact && { ok: true, contact };
      }
      if (!(await owned(id))) return null;
      return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
    },

    async remove(id: string) {
      if (!(await owned(id))) return null;
      return prisma.contact.delete({ where: { id } });
    },
  };
}
