// src/app/contacts/new/page.tsx
import ContactForm from "@/components/forms/ContactForm";
import { createContact } from "../actions";
import { prisma } from "@/lib/db";

export default async function NewContactPage() {
  const settings = await prisma.setting.findFirst();
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">New contact</h1>
      <p className="mt-1 text-sm text-slate-500">
        Create a contact with a category and reminder interval.
      </p>

      <div className="mt-6 rounded-xl border p-4">
        <ContactForm
          action={createContact}
          submitLabel="Create contact"
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
          // Show "Active" toggle on create
          showActiveToggle={true}
        />
      </div>
    </main>
  );
}
