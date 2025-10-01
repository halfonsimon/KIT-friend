// src/app/digest/page.tsx
import { buildDigest } from "@/lib/digest";
import { formatDateUTC } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import SendDigestButton from "./SendDigestButton";
import PushNotificationButton from "@/components/PushNotificationButton";

export const dynamic = "force-dynamic"; // always fresh

function Section({
  title,
  items,
  color,
}: {
  title: string;
  color: "red" | "orange" | "green";
  items: {
    id: string;
    name: string;
    category: string;
    status: "overdue" | "today" | "ok";
    daysUntilDue: number;
    nextDueAt: Date;
  }[];
}) {
  if (!items.length) return null;

  const colorClasses = {
    red: "border-red-200 bg-red-50",
    orange: "border-orange-200 bg-orange-50",
    green: "border-green-200 bg-green-50",
  };

  const iconClasses = {
    red: "text-red-600",
    orange: "text-orange-600",
    green: "text-green-600",
  };

  const getIcon = () => {
    if (color === "red") {
      return (
        <svg
          className={`w-5 h-5 ${iconClasses[color]}`}
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
      );
    }
    if (color === "orange") {
      return (
        <svg
          className={`w-5 h-5 ${iconClasses[color]}`}
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
      );
    }
    return (
      <svg
        className={`w-5 h-5 ${iconClasses[color]}`}
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
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {getIcon()}
        </div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
          {items.length}
        </span>
      </div>

      <div className="grid gap-3">
        {items.map((i) => (
          <div
            key={i.id}
            className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-900">{i.name}</h3>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {i.category}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Due: {formatDateUTC(i.nextDueAt)}
                </p>
              </div>
              <StatusBadge status={i.status} daysUntilDue={i.daysUntilDue} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function DigestPage() {
  const data = await buildDigest(new Date());

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">
          Daily Digest Preview
        </h1>
        <div className="inline-flex items-center gap-6 px-6 py-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {data.stats.overdue}
            </div>
            <div className="text-sm text-slate-600">Overdue</div>
          </div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {data.stats.today}
            </div>
            <div className="text-sm text-slate-600">Today</div>
          </div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.stats.upcoming}
            </div>
            <div className="text-sm text-slate-600">Upcoming</div>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Contacts inactivated are excluded.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        <Section title="Overdue Contacts" items={data.overdue} color="red" />
        <Section title="Due Today" items={data.today} color="orange" />
        <Section title="Coming Up" items={data.upcoming} color="green" />
      </div>

      {/* No contacts message */}
      {data.stats.total === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
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
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            All caught up!
          </h3>
          <p className="text-slate-600">
            No contacts need your attention right now.
          </p>
        </div>
      )}

      {/* Push notifications setup */}
      <div className="mb-6">
        <PushNotificationButton />
      </div>

      {/* Send digest button */}
      <div className="text-center">
        <SendDigestButton />
      </div>
    </div>
  );
}
