// Server component: fetch contacts from our API and render a simple list
export const dynamic = "force-dynamic";
import { formatDateUTC } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { headers } from "next/headers";
import TouchButton from "@/components/TouchButton";
import DeleteButton from "@/components/DeleteButton";
import { deleteContact } from "./actions";

type ApiRow = {
  id: string;
  name: string;
  category: "FAMILY" | "FRIEND" | "WORK" | "OTHER";
  status: "overdue" | "today" | "ok";
  daysUntilDue: number;
  nextDueAt: string; // ISO from the API
  // (Other fields exist but we don't need them here)
};

async function getContacts(): Promise<ApiRow[]> {
  // Build an absolute URL for server-side fetch (avoids "Failed to parse URL" during SSG)
  const h = await headers();
  const host = h.get("host");
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  const base = `${proto}://${host}`;
  // no-store = always fresh data (no caching)
  const res = await fetch(`${base}/api/contacts`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load contacts: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return (json?.data ?? []) as ApiRow[];
}

export default async function ContactsPage() {
  const rows = await getContacts();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
      <p className="mt-1 text-sm text-slate-500">
        Overdue → Today → OK. Data is computed on the server.
      </p>

      <div className="mt-4">
        <a
          href="/contacts/new"
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          New contact
        </a>
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
          No contacts yet. Add some in Prisma Studio, then refresh.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Next due
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {r.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {r.category}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={r.status}
                      daysUntilDue={r.daysUntilDue}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {formatDateUTC(r.nextDueAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TouchButton id={r.id} disabled={r.status === "today"} />
                      <a
                        href={`/contacts/${r.id}/edit`}
                        className="rounded-md border px-3 py-1 text-sm hover:bg-slate-50"
                      >
                        Edit
                      </a>
                      <DeleteButton
                        contactId={r.id}
                        contactName={r.name}
                        action={deleteContact}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
