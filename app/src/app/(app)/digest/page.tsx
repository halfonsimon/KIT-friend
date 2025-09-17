// src/app/digest/page.tsx
import { buildDigest } from "../../../lib/digest";
import { formatDateUTC } from "../../../lib/format";
import StatusBadge from "../../../components/StatusBadge";
import SendDigestButton from "./SendDigestButton";

export const dynamic = "force-dynamic"; // always fresh

function Section({
  title,
  items,
}: {
  title: string;
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
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-2 divide-y rounded-xl border">
        {items.map((i) => (
          <li
            key={i.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <div className="font-medium">{i.name}</div>
              <div className="text-xs text-slate-500">{i.category}</div>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge status={i.status} daysUntilDue={i.daysUntilDue} />
              <div className="text-sm text-slate-700">
                {formatDateUTC(i.nextDueAt)}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function DigestPage() {
  const data = await buildDigest(new Date());

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Daily digest (preview)
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Overdue <b>{data.stats.overdue}</b> • Today <b>{data.stats.today}</b> •{" "}
        Upcoming <b>{data.stats.upcoming}</b>
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Only contacts with <b>Notify ≠ NONE</b> would actually be emailed.
      </p>

      <Section title="Overdue" items={data.overdue} />
      <Section title="Today" items={data.today} />
      <Section title="Upcoming (next 2)" items={data.upcoming} />
      <SendDigestButton />
    </main>
  );
}
