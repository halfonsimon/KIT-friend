// Contacts: everyone, longest wait first, with search and filters.
import ContactsScreen, { type ContactRow } from "@/components/contacts/ContactsScreen";
import { toTodayPerson } from "@/components/today/types";
import { requireUser } from "@/lib/auth-utils";
import { roster } from "@/lib/roster";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const userId = await requireUser();
  const now = new Date();
  const people = await roster(userId, now);

  // Active Contacts in due order, then the Paused ones.
  const rows: ContactRow[] = people
    .map((c) => ({
      ...toTodayPerson(c, now),
      isActive: c.isActive,
      due: c.status !== "ok",
      daysUntilDue: c.daysUntilDue,
    }))
    .sort((a, b) => Number(b.isActive) - Number(a.isActive));

  return <ContactsScreen contacts={rows} />;
}
