/**
 * Everything the Contact page shows, in one database round trip: the Contact
 * as the app sees it (with its notes, from the per-user Contact module) and
 * the user's Settings, queried at once.
 */
import { contactsOf } from "./contacts-of";
import { getSettings } from "./settings";

export async function contactPage(userId: string, contactId: string, now: Date) {
  const started = performance.now();
  const [contact, settings] = await Promise.all([contactsOf(userId).view(contactId, now), getSettings(userId)]);
  console.log(`[timing] contact-page db=${Math.round(performance.now() - started)}ms`);
  if (!contact) return null;
  return { contact, settings };
}
