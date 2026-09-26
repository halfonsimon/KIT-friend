// The Contacts list as ContactsScreen shows it, shared by /contacts and /contacts/new.
import { contactList } from "@/lib/contact-card";
import { roster } from "@/lib/roster";
import { getSettings } from "@/lib/settings";

export async function loadContacts(userId: string) {
  const now = new Date();
  const [people, settings] = await Promise.all([roster(userId, now), getSettings(userId)]);
  return { rows: contactList(people, now), defaults: settings.defaultsByCategory };
}
