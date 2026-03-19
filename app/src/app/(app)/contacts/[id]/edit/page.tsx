// src/app/contacts/[id]/edit/page.tsx
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import ContactForm from "@/components/forms/ContactForm";
import ContactBriefing from "@/components/ContactBriefing";
import { notFound } from "next/navigation";
import { updateContact } from "../../actions";

type Params = { params: Promise<{ id: string }> };

export default async function EditContactPage({ params }: Params) {
  const resolvedParams = await params;
  const c = await prisma.contact.findUnique({
    where: { id: resolvedParams.id },
  });
  if (!c) notFound();

  const settings = await prisma.setting.findFirst();

  // Parse AI data
  const keyTopics = c.keyTopics ? JSON.parse(c.keyTopics) : [];
  const followUps = c.followUps ? JSON.parse(c.followUps) : [];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Edit Contact</h1>
        <p className="mt-2 text-slate-600">
          Update contact information and reminder settings.
        </p>
      </div>

      {/* AI Memory Section */}
      <ContactBriefing
        contactId={c.id}
        contactName={c.name}
        aiSummary={c.aiSummary}
        keyTopics={keyTopics}
        followUps={followUps}
      />

      <ContactForm
        action={updateContact}
        submitLabel="Save Changes"
        showActiveToggle={true}
        categoryDefaults={{
          FAMILY: settings?.defaultFamilyDays ?? 7,
          FRIEND: settings?.defaultFriendDays ?? 30,
          WORK: settings?.defaultWorkDays ?? 14,
          OTHER: settings?.defaultOtherDays ?? 21,
        }}
        initialValues={{
          id: c.id,
          name: c.name,
          phone: c.phone,
          category: c.category as "FAMILY" | "FRIEND" | "WORK" | "OTHER",
          intervalDays: c.intervalDays,
          isActive: c.isActive,
        }}
      />
    </div>
  );
}
