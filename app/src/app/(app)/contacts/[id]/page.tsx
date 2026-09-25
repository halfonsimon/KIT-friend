// One Contact: what you know about them, your notes, and the Edit sheet.
import { notFound } from "next/navigation";
import ContactScreen, { type ContactNote } from "@/components/contacts/ContactScreen";
import { toTodayPerson } from "@/components/today/types";
import { requireUser } from "@/lib/auth-utils";
import { asCategory, readStoredAiMemory } from "@/lib/contact";
import { contactPage } from "@/lib/contact-page";
import { computeStatus } from "@/lib/due";

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
  const page = await contactPage(userId, id);
  if (!page) notFound();
  const { contact, settings, interactions } = page;

  const now = new Date();

  const person = toTodayPerson(
    {
      ...contact,
      category: asCategory(contact.category),
      hasAiSummary: !!contact.aiSummary,
      ...readStoredAiMemory(contact),
      ...computeStatus(contact, now),
    },
    now
  );

  const notes: ContactNote[] = interactions
    .filter((i) => i.note?.trim())
    .map((i) => ({ id: i.id, date: dayMonth(i.notedAt), note: i.note!.trim() }));
  const oldest = notes.length ? interactions.filter((i) => i.note?.trim()).at(-1)!.notedAt : null;
  const notesSummary = oldest
    ? `${notes.length} ${notes.length === 1 ? "note" : "notes"} since ${month(oldest)}`
    : null;

  return (
    <ContactScreen
      person={person}
      isActive={contact.isActive}
      notes={notes}
      notesSummary={notesSummary}
      defaults={settings.defaultsByCategory}
      editing={edit === "1"}
    />
  );
}
