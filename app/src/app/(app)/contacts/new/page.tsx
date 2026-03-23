// src/app/contacts/new/page.tsx
export const dynamic = "force-dynamic";

import ContactForm from "@/components/forms/ContactForm";
import { createContact } from "../actions";
import { getSettings } from "@/lib/settings";
import { DEFAULT_CATEGORY } from "@/lib/contact";
import { requireUser } from "@/lib/auth-utils";

export default async function NewContactPage() {
  const userId = await requireUser();
  const settings = await getSettings(userId);
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
          category: DEFAULT_CATEGORY,
          isActive: true,
        }}
        categoryDefaults={{
          FAMILY: settings.defaultsByCategory.FAMILY,
          FRIEND: settings.defaultsByCategory.FRIEND,
          WORK: settings.defaultsByCategory.WORK,
          OTHER: settings.defaultsByCategory.OTHER,
        }}
        showActiveToggle={true}
      />
    </div>
  );
}
