// One Contact: what you know about them, your notes, and the Edit sheet.
import { notFound } from "next/navigation";
import ContactScreen, { type ContactNote } from "@/components/contacts/ContactScreen";
import { requireUser } from "@/lib/auth-utils";
import { contactCard, dayMonth } from "@/lib/contact-card";
import { contactPage } from "@/lib/contact-page";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
};

const month = (d: Date) => d.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });

export default async function ContactPage({ params, searchParams }: Props) {
  const userId = await requireUser();
  const [{ id }, { edit }] = await Promise.all([params, searchParams]);
  const now = new Date();
  const page = await contactPage(userId, id, now);
  if (!page) notFound();
  const { contact, settings } = page;

  const person = contactCard(contact, now);

  const notes: ContactNote[] = contact.interactions.map((i) => ({ id: i.id, date: dayMonth(i.notedAt, now), note: i.note }));
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
