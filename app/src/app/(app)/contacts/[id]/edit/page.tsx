// src/app/contacts/[id]/edit/page.tsx
import { prisma } from "@/lib/db";
import ContactForm from "@/components/forms/ContactForm";
import { notFound } from "next/navigation";
import { updateContact } from "../../actions";

type Params = { params: Promise<{ id: string }> };

export default async function EditContactPage({ params }: Params) {
  const resolvedParams = await params;
  const c = await prisma.contact.findUnique({
    where: { id: resolvedParams.id },
  });
  if (!c) notFound();

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Edit contact</h1>
      <p className="mt-1 text-sm text-slate-500">
        Update basic info, category, and interval.
      </p>

      <div className="mt-6 rounded-xl border p-4">
        <ContactForm
          action={updateContact}
          submitLabel="Save changes"
          showActiveToggle={true}
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
    </main>
  );
}
