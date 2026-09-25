/**
 * Everything the Contact page shows, in one database round trip: the Contact,
 * the user's Settings and the Contact's Interactions, all queried at once.
 * The Interactions query is scoped by owner too, so it can run before the
 * ownership check without ever returning another user's notes.
 */
import { prisma } from "./db";
import { contactsOf } from "./contacts-of";
import { getSettings } from "./settings";

export async function contactPage(userId: string, contactId: string) {
  const started = performance.now();
  const [contact, settings, interactions] = await Promise.all([
    contactsOf(userId).get(contactId),
    getSettings(userId),
    prisma.interaction.findMany({
      where: { contactId, contact: { userId } },
      orderBy: { notedAt: "desc" },
    }),
  ]);
  console.log(`[timing] contact-page db=${Math.round(performance.now() - started)}ms`);
  if (!contact) return null;
  return { contact, settings, interactions };
}
