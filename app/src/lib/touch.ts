/**
 * Touch: record that the user just got in touch with a contact, optionally
 * with a note. Takes `now` as an input so it can be tested without a clock.
 */
import { contactsOf } from "./contacts";
import { prisma } from "./db";
import { computeStatus, type Computed } from "./due";

export type TouchResult = Computed & {
  id: string;
  lastContactedAt: Date;
};

/** Record a touch. Returns `null` when the contact is missing or not the user's. */
export async function recordTouch(input: {
  userId: string;
  contactId: string;
  note: string;
  now: Date;
}): Promise<TouchResult | null> {
  const touched = await contactsOf(input.userId).update(input.contactId, {
    lastContactedAt: input.now,
  });
  if (!touched) return null;

  const note = input.note.trim();
  if (note) {
    await prisma.interaction.create({
      data: { contactId: touched.id, note, notedAt: input.now },
    });
  }

  return {
    id: touched.id,
    lastContactedAt: input.now,
    ...computeStatus(touched, input.now),
  };
}
