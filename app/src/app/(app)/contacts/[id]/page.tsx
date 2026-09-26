// One Contact: what you know about them, your notes, and the Edit sheet.
import { notFound } from "next/navigation";
import ContactScreen, { type ContactNote } from "@/components/contacts/ContactScreen";
import { requireUser } from "@/lib/auth-utils";
import { contactCard } from "@/lib/contact-card";
import { contactsOf } from "@/lib/contacts-of";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
};

const dayMonth = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
const month = (d: Date) => d.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });

export default async function ContactPage({ params, searchParams }: Props) {
  const userId = await requireUser();
  const [{ id }, { edit }] = await Promise.all([params, searchParams]);
  const now = new Date();
  const [contact, settings] = await Promise.all([contactsOf(userId).view(id, now), getSettings(userId)]);
  if (!contact) notFound();

  const person = contactCard(contact, now);

  const notes: ContactNote[] = contact.interactions.map((i) => ({ id: i.id, date: dayMonth(i.notedAt), note: i.note }));
  const oldest = contact.interactions.at(-1)?.notedAt;
  const notesSummary = oldest
    ? `${notes.length} ${notes.length === 1 ? "note" : "notes"} since ${month(oldest)}`
    : null;

  return (
    <ContactScreen
      person={person}
      notes={notes}
      notesSummary={notesSummary}
      defaults={settings.defaultsByCategory}
      editing={edit === "1"}
    />
  );
}
