// Server component: fetch contacts directly from database
export const dynamic = "force-dynamic";
import { formatDateUTC } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import TouchButton from "@/components/TouchButton";
import DeleteButton from "@/components/DeleteButton";
import { deleteContact } from "./actions";
import { prisma } from "@/lib/db";
import { computeStatus, type ContactLike } from "@/lib/due";

type ContactRow = {
  id: string;
  name: string;
  category: "FAMILY" | "FRIEND" | "WORK" | "OTHER";
  status: "overdue" | "today" | "ok";
  daysUntilDue: number;
  nextDueAt: Date;
  hasAiSummary: boolean;
};

async function getContacts(): Promise<ContactRow[]> {
  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  const rows = contacts.map((c) => {
    const computed = computeStatus(
      {
        id: c.id,
        name: c.name,
        phone: c.phone,
        intervalDays: c.intervalDays,
        createdAt: c.createdAt,
        lastContactedAt: c.lastContactedAt ?? undefined,
      } as ContactLike,
      now
    );
    return {
      id: c.id,
      name: c.name,
      category: c.category as "FAMILY" | "FRIEND" | "WORK" | "OTHER",
      status: computed.status,
      daysUntilDue: computed.daysUntilDue,
      nextDueAt: computed.nextDueAt,
      hasAiSummary: !!c.aiSummary,
    };
  });

  const order: Record<"overdue" | "today" | "ok", number> = {
    overdue: 0,
    today: 1,
    ok: 2,
  };
  rows.sort((a, b) => {
    const s = order[a.status] - order[b.status];
    if (s !== 0) return s;
    return a.nextDueAt.getTime() - b.nextDueAt.getTime();
  });

  return rows;
}

export default async function ContactsPage() {
  const rows = await getContacts();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Contacts</h1>
          <p className="mt-2 text-slate-600">
            Manage your contacts and track when to reach out next
          </p>
        </div>
        <a
          href="/contacts/new"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-[1.02]"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          New Contact
        </a>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No contacts yet
          </h3>
          <p className="text-slate-600 mb-6">
            Get started by adding your first contact
          </p>
          <a
            href="/contacts/new"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
          >
            Add Contact
          </a>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Overdue</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {rows.filter((r) => r.status === "overdue").length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <svg
                    className="w-5 h-5 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">
                    Due Today
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {rows.filter((r) => r.status === "today").length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">All Good</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {rows.filter((r) => r.status === "ok").length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contacts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rows.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {r.name}
                        </h3>
                        {r.hasAiSummary && (
                          <span
                            className="p-1 bg-indigo-100 rounded-full"
                            title="Has AI memory"
                          >
                            <svg
                              className="w-3 h-3 text-indigo-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                              />
                            </svg>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mt-1">
                        {r.category}
                      </p>
                    </div>
                    <StatusBadge
                      status={r.status}
                      daysUntilDue={r.daysUntilDue}
                    />
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Next due:</span>{" "}
                      {formatDateUTC(r.nextDueAt.toISOString())}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <TouchButton id={r.id} name={r.name} disabled={r.status === "today"} />
                    <a
                      href={`/contacts/${r.id}/edit`}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
                    >
                      <svg
                        className="w-4 h-4 mr-1.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit
                    </a>
                    <DeleteButton
                      contactId={r.id}
                      contactName={r.name}
                      action={deleteContact}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
