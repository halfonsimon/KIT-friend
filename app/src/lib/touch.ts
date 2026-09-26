/**
 * Touch: record that the user just got in touch with a contact, optionally
 * with a note. A note is also merged into the contact's Relationship memory
 * (AI summary, key topics, follow-ups). Takes `now`, the memory adapter and a
 * `defer` scheduler as inputs so it can be tested without a clock or Gemini.
 */
import type { RelationshipMemory } from "./ai";
import { buildContactContext, stringifyStoredStringArray } from "./contact";
import { contactsOf } from "./contacts-of";
import { computeStatus, type Computed } from "./due";

export type TouchResult = Computed & {
  id: string;
  lastContactedAt: Date;
  /** The last touch before this one, so the touch can be undone. */
  previousContactedAt: Date | null;
};

/** Runs work after the response: Next's `after()` in production. */
export type Defer = (task: () => Promise<void>) => void | Promise<void>;

const RECENT_INTERACTIONS = 10;

/**
 * Record a touch. Returns `null` when the contact is missing or not the user's.
 * With a note and a memory adapter, updates the Relationship memory through
 * `defer` (awaited inline by default). If the adapter fails, the stored
 * memory is left unchanged.
 */
export async function recordTouch(input: {
  userId: string;
  contactId: string;
  note: string;
  now: Date;
  memory?: RelationshipMemory;
  defer?: Defer;
}): Promise<TouchResult | null> {
  const contacts = contactsOf(input.userId);
  const before = await contacts.get(input.contactId);
  if (!before) return null;
  const touched = await contacts.update(input.contactId, {
    lastContactedAt: input.now,
  });
  if (!touched) return null;

  const note = input.note.trim();
  if (note) {
    const earlier = (await contacts.recentNotes(touched.id, RECENT_INTERACTIONS)) ?? [];
    await contacts.saveNote(touched.id, note, input.now);

    const memory = input.memory;
    if (memory) {
      const context = buildContactContext({ ...touched, interactions: earlier });
      const defer = input.defer ?? ((task) => task());
      await defer(() => rememberNote(input.userId, touched.id, note, context, memory));
    }
  }

  return {
    id: touched.id,
    lastContactedAt: input.now,
    previousContactedAt: before.lastContactedAt,
    ...computeStatus(touched, input.now),
  };
}

/**
 * Undo a touch recorded at `touchedAt`: put the last touch back to
 * `restoreTo` and drop the note saved with it. Does nothing (returns false)
 * once the contact has been touched again since. Returns `null` when the
 * contact is missing or not the user's. Relationship memory already learned
 * from the note is kept.
 */
export async function undoTouch(input: {
  userId: string;
  contactId: string;
  touchedAt: Date;
  restoreTo: Date | null;
}): Promise<boolean | null> {
  const contacts = contactsOf(input.userId);
  const contact = await contacts.get(input.contactId);
  if (!contact) return null;
  if (contact.lastContactedAt?.getTime() !== input.touchedAt.getTime()) return false;

  await contacts.update(contact.id, { lastContactedAt: input.restoreTo });
  await contacts.dropNote(contact.id, input.touchedAt);
  return true;
}

async function rememberNote(
  userId: string,
  contactId: string,
  note: string,
  context: Parameters<RelationshipMemory["remember"]>[1],
  memory: RelationshipMemory
) {
  try {
    const processed = await memory.remember(note, context);
    // A contact deleted while the AI was working is simply skipped (null).
    await contactsOf(userId).update(contactId, {
      aiSummary: processed.summary,
      keyTopics: stringifyStoredStringArray(processed.keyTopics),
      followUps: stringifyStoredStringArray(processed.followUps),
    });
  } catch (error) {
    // Keep the existing summary, topics and follow-ups on any AI failure.
    console.error(`Relationship memory update failed for contact ${contactId}:`, error);
  }
}
