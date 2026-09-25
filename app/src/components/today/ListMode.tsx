"use client";

import { useState } from "react";
import CategoryChip, { categoryStyle } from "@/components/ui/CategoryChip";
import Icon from "@/components/ui/Icon";
import { buttonClass, type ButtonVariant } from "@/components/ui/button";
import { CallLink } from "./bits";
import { categoryAndLastTalked, type TodayPerson } from "./types";

type Props = {
  suggested: TodayPerson[];
  others: TodayPerson[];
  onTalk: (p: TodayPerson) => void;
  busyId: string | null;
};

// The three "Start with" cards: ultramarine, ice, white.
const LOOKS: { card: string; sub: string; chip: string; call: string; button: ButtonVariant }[] = [
  { card: "bg-brand text-white shadow-brand", sub: "text-brand-soft", chip: "bg-white/15", call: "bg-white/15 text-white", button: "white" },
  { card: "bg-ice text-ink shadow-card", sub: "text-muted", chip: "bg-brand/10", call: "bg-brand/10 text-ink", button: "brand" },
  { card: "bg-white text-ink shadow-card", sub: "text-muted", chip: "bg-ground", call: "bg-ground text-ink", button: "primary" },
];

const INITIAL_OTHERS = 8;

export function Glow({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full bg-[rgb(120_140_245)] opacity-55 blur-[60px] ${className}`}
    />
  );
}

function startTitle(people: TodayPerson[]) {
  if (people.length === 1) return `Start with ${people[0].name}`;
  return `Start with these ${people.length}`;
}

function StartCard({ person, index, onTalk, busy }: { person: TodayPerson; index: number; onTalk: () => void; busy: boolean }) {
  const look = LOOKS[index % LOOKS.length];
  const { label, icon } = categoryStyle[person.category];
  return (
    <article className={`relative flex min-h-[300px] flex-col gap-4 overflow-hidden rounded-[30px] p-[22px] ${look.card}`}>
      {index === 0 && <Glow className="-right-24 -top-32 h-60 w-60" />}
      <span className={`relative inline-flex h-8 items-center gap-1.5 self-start rounded-full px-3 text-[13px] font-bold ${look.chip}`}>
        <Icon name={icon} size={15} />
        {label}
      </span>
      <div className="relative mt-2 flex flex-col gap-1.5">
        <h3 className="display text-[40px]">{person.name}</h3>
        <span className={`text-sm font-medium ${look.sub}`}>{person.lastTalked}</span>
      </div>
      {person.nextCall[0] && <p className="relative text-[15px] font-semibold leading-snug">{person.nextCall[0]}</p>}
      <div className="relative mt-auto flex gap-2">
        <CallLink name={person.name} phone={person.phone} className={`h-12 w-12 ${look.call}`} />
        <button type="button" onClick={onTalk} disabled={busy} className={buttonClass(look.button, "md", "flex-1")}>
          We talked
        </button>
      </div>
    </article>
  );
}

/** Phone: the first suggestion as a compact ultramarine card, the rest as rows. */
function PhoneStart({ people, onTalk, busyId }: { people: TodayPerson[]; onTalk: (p: TodayPerson) => void; busyId: string | null }) {
  const [first, ...rest] = people;
  return (
    <ul className="flex flex-col gap-2 sm:hidden">
      <li className="relative flex flex-col gap-3 overflow-hidden rounded-3xl bg-brand p-[18px] text-white shadow-brand">
        <Glow className="-right-20 -top-28 h-56 w-56" />
        <span className="relative flex items-baseline justify-between gap-3">
          <span className="display text-[28px]">{first.name}</span>
          <span className="text-right text-[13px] text-brand-soft">
            {categoryAndLastTalked(categoryStyle[first.category].label, first)}
          </span>
        </span>
        {first.nextCall[0] && <span className="relative text-[15px] font-semibold leading-snug">{first.nextCall[0]}</span>}
        <span className="relative flex gap-2">
          <CallLink name={first.name} phone={first.phone} className="h-11 w-11 bg-white/15 text-white" />
          <button type="button" onClick={() => onTalk(first)} disabled={busyId === first.id} className={buttonClass("white", "sm", "flex-1")}>
            We talked
          </button>
        </span>
      </li>
      {rest.map((p, i) => (
        <li
          key={p.id}
          className={`flex items-center gap-2.5 rounded-[22px] py-3.5 pl-[18px] pr-3.5 shadow-card ${i === 0 ? "bg-ice" : "bg-white"}`}
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="display truncate text-xl">{p.name}</span>
            <span className="truncate text-[13px] text-muted">{p.lastTalkedShort}</span>
          </span>
          <CallLink name={p.name} phone={p.phone} className={`h-11 w-11 ${i === 0 ? "bg-brand/10" : "bg-ground"} text-ink`} />
          <button type="button" onClick={() => onTalk(p)} disabled={busyId === p.id} className={buttonClass("brand", "sm")}>
            We talked
          </button>
        </li>
      ))}
    </ul>
  );
}

function OthersList({ people, onTalk, busyId }: { people: TodayPerson[]; onTalk: (p: TodayPerson) => void; busyId: string | null }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? people : people.slice(0, INITIAL_OTHERS);
  const hidden = people.length - shown.length;

  return (
    <div className="glass rounded-[28px] px-4 md:px-[22px]">
      <ul>
        {shown.map((p) => (
          <li
            key={p.id}
            className="flex min-h-[60px] items-center gap-3 border-b border-ink/[0.07] py-2 last:border-b-0 md:grid md:grid-cols-[1fr_120px_200px_44px_120px]"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-base font-bold">{p.name}</span>
              <span className="truncate text-[13px] text-muted md:hidden">
                {categoryAndLastTalked(categoryStyle[p.category].label, p)}
              </span>
            </span>
            <span className="hidden md:block">
              <CategoryChip category={p.category} />
            </span>
            <span className="hidden text-sm text-muted md:block">{p.lastTalked}</span>
            <span className="hidden md:block">
              <CallLink name={p.name} phone={p.phone} className="h-11 w-11 text-ink hover:bg-ground" />
            </span>
            <button type="button" onClick={() => onTalk(p)} disabled={busyId === p.id} className={buttonClass("soft", "sm")}>
              We talked
            </button>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="flex h-12 w-full items-center justify-center border-t border-ink/[0.07] text-[15px] font-bold text-brand"
        >
          Show {hidden} more
        </button>
      )}
    </div>
  );
}

export default function ListMode({ suggested, others, onTalk, busyId }: Props) {
  return (
    <div className="flex flex-col gap-9">
      {suggested.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-extrabold tracking-tight md:text-2xl">{startTitle(suggested)}</h2>
          <PhoneStart people={suggested} onTalk={onTalk} busyId={busyId} />
          <div className="hidden gap-[18px] sm:grid sm:grid-cols-3">
            {suggested.map((p, i) => (
              <StartCard key={p.id} person={p} index={i} onTalk={() => onTalk(p)} busy={busyId === p.id} />
            ))}
          </div>
        </section>
      )}
      {others.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-extrabold tracking-tight md:text-2xl">
            {suggested.length > 0 ? "Everyone else" : "Still waiting"}
          </h2>
          <OthersList people={others} onTalk={onTalk} busyId={busyId} />
        </section>
      )}
    </div>
  );
}
