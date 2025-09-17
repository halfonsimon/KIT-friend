// src/app/contacts/new/page.tsx
import ContactForm from "../../../../components/forms/ContactForm";
import { createContact } from "../actions";

export default function NewContactPage() {
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
            intervalDays: 30,
            notifyChannel: "NONE",
            isActive: true,
          }}
          // No "Active" toggle on create (defaults to true)
          showActiveToggle={false}
        />
      </div>
    </main>
  );
}
