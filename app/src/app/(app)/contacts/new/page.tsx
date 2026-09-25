// Add someone: the Contacts list with the "Add someone" sheet open.
import ContactsScreen from "@/components/contacts/ContactsScreen";
import { requireUser } from "@/lib/auth-utils";
import { loadContacts } from "../rows";

export const dynamic = "force-dynamic";

export default async function NewContactPage() {
  const { rows, defaults } = await loadContacts(await requireUser());
  return <ContactsScreen contacts={rows} defaults={defaults} adding />;
}
