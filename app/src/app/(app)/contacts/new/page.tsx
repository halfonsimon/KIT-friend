// src/app/contacts/new/page.tsx
export const dynamic = "force-dynamic";

import ContactForm from "@/components/forms/ContactForm";
import { createContact } from "../actions";
import { prisma } from "@/lib/db";

export default async function NewContactPage() {
  const settings = await prisma.setting.findFirst();
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Add New Contact</h1>
        <p className="mt-2 text-slate-600">
          Create a new contact and set up reminder intervals to stay in touch.
        </p>
      </div>

      <ContactForm
        action={createContact}
        submitLabel="Create Contact"
        initialValues={{
          category: "FRIEND",
          isActive: true,
        }}
        categoryDefaults={{
          FAMILY: settings?.defaultFamilyDays ?? 7,
          FRIEND: settings?.defaultFriendDays ?? 30,
          WORK: settings?.defaultWorkDays ?? 14,
          OTHER: settings?.defaultOtherDays ?? 21,
        }}
        showActiveToggle={true}
      />
    </div>
  );
}
