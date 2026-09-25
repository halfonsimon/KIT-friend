// The Contacts list as ContactsScreen shows it, shared by /contacts and /contacts/new.
import type { ContactRow } from "@/components/contacts/ContactsScreen";
import { toTodayPerson } from "@/components/today/types";
import { roster } from "@/lib/roster";
import { getSettings } from "@/lib/settings";

export async function loadContacts(userId: string) {
  const now = new Date();
  const [people, settings] = await Promise.all([roster(userId, now), getSettings(userId)]);

  // Active Contacts in due order, then the Paused ones.
  const rows: ContactRow[] = people
    .map((c) => ({
      ...toTodayPerson(c, now),
      isActive: c.isActive,
      due: c.status !== "ok",
      daysUntilDue: c.daysUntilDue,
    }))
    .sort((a, b) => Number(b.isActive) - Number(a.isActive));

  return { rows, defaults: settings.defaultsByCategory };
}
