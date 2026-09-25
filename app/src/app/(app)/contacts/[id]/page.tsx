// One Contact: what you know about them, your notes, and the Edit sheet.
import { notFound } from "next/navigation";
import ContactScreen, { type ContactNote } from "@/components/contacts/ContactScreen";
import { toTodayPerson } from "@/components/today/types";
import { requireUser } from "@/lib/auth-utils";
import { asCategory, readStoredAiMemory } from "@/lib/contact";
import { contactsOf } from "@/lib/contacts-of";
import { prisma } from "@/lib/db";
import { computeStatus } from "@/lib/due";
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
  const contact = await contactsOf(userId).get(id);
  if (!contact) notFound();

  const now = new Date();
  const [settings, interactions] = await Promise.all([
    getSettings(userId),
    prisma.interaction.findMany({
      where: { contactId: contact.id },
      orderBy: { notedAt: "desc" },
    }),
  ]);

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
