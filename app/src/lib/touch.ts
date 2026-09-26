/**
 * Touch: record that the user just got in touch with a contact, optionally
 * with a note. Every Touch is saved as an Interaction. A note is also merged
 * into the contact's Relationship memory (AI summary, key topics, follow-ups).
 * Takes `now`, the memory adapter and a `defer` scheduler as inputs so it can
 * be tested without a clock or Gemini.
 */
import type { RelationshipMemory } from "./ai";
import { buildContactContext, stringifyStoredStringArray } from "./contact";
import { contactsOf } from "./contacts-of";
import { computeStatus, type Computed } from "./due";

export type TouchResult = Computed & {
  id: string;
  lastContactedAt: Date;
  /** Opaque value identifying this Touch, for undoing it. */
  undo: string;
};

/** Runs work after the response: Next's `after()` in production. */
export type Defer = (task: () => Promise<void>) => void | Promise<void>;

const RECENT_INTERACTIONS = 10;

/**
 * Record a touch. The note is trimmed here; a blank one means no note.
 * Returns `null` when the contact is missing or not the user's. With a note
 * and a memory adapter, updates the Relationship memory through `defer`
 * (awaited inline by default). If the adapter fails, the stored
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
  const note = input.note.trim() || null;
  const earlier = note ? await contacts.recentNotes(input.contactId, RECENT_INTERACTIONS) : [];
  const saved = await contacts.saveTouch(input.contactId, { note, at: input.now });
  if (!saved) return null;
  const { contact: touched, touchId } = saved;

  const memory = input.memory;
  if (note && memory) {
    const context = buildContactContext({ ...touched, interactions: earlier ?? [] });
    const defer = input.defer ?? ((task) => task());
    await defer(() => rememberNote(input.userId, touched.id, note, context, memory));
  }

  return {
    id: touched.id,
    lastContactedAt: input.now,
    undo: touchId,
    ...computeStatus(touched, input.now),
  };
}

export type UndoResult = "undone" | "not_found" | "touched_again";

/**
 * Undo a Touch by its Undo value (from `recordTouch`): put the contact's last
 * Touch back to the one stored with it and drop that Touch and its note.
 * "not_found" when the value is unknown or not the user's; "touched_again"
 * (changing nothing) once the contact has been touched since. Relationship
 * memory already learned from the note is kept.
 */
export async function undoTouch(input: { userId: string; undo: string }): Promise<UndoResult> {
  return contactsOf(input.userId).undoTouch(input.undo);
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
