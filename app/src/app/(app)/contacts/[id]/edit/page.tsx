// src/app/contacts/[id]/edit/page.tsx
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import ContactForm from "@/components/forms/ContactForm";
import ContactBriefing from "@/components/ContactBriefing";
import { notFound } from "next/navigation";
import { updateContact } from "../../actions";
import { getSettings } from "@/lib/settings";
import { readStoredAiMemory, type Category } from "@/lib/contact";
import { requireUser } from "@/lib/auth-utils";

type Params = { params: Promise<{ id: string }> };

export default async function EditContactPage({ params }: Params) {
  const userId = await requireUser();
  const resolvedParams = await params;
  const c = await prisma.contact.findUnique({
    where: { id: resolvedParams.id, userId },
  });
  if (!c) notFound();

  const settings = await getSettings(userId);
  const aiMemory = readStoredAiMemory(c);

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
        aiSummary={aiMemory.aiSummary}
        keyTopics={aiMemory.keyTopics}
        followUps={aiMemory.followUps}
      />

      <ContactForm
        action={updateContact}
        submitLabel="Save Changes"
        showActiveToggle={true}
        categoryDefaults={{
          FAMILY: settings.defaultsByCategory.FAMILY,
          FRIEND: settings.defaultsByCategory.FRIEND,
          WORK: settings.defaultsByCategory.WORK,
          OTHER: settings.defaultsByCategory.OTHER,
        }}
        initialValues={{
          id: c.id,
          name: c.name,
          phone: c.phone,
          category: c.category as Category,
          intervalDays: c.intervalDays,
          isActive: c.isActive,
        }}
      />
    </div>
  );
}
