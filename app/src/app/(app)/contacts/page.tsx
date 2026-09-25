// Contacts: everyone, longest wait first, with search and filters.
import ContactsScreen from "@/components/contacts/ContactsScreen";
import { requireUser } from "@/lib/auth-utils";
import { loadContacts } from "./rows";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const { rows, defaults } = await loadContacts(await requireUser());
  return <ContactsScreen contacts={rows} defaults={defaults} />;
}
