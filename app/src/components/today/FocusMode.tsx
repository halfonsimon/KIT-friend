"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/button";
import { categoryStyle } from "@/components/ui/CategoryChip";
import { CallLink, NextCallList, NoteInput } from "./bits";
import { Glow } from "./ListMode";
import { everyLabel, type TodayPerson } from "./types";

type Props = {
  queue: TodayPerson[];
  onTalk: (p: TodayPerson, note: string) => Promise<boolean>;
  onLater: (p: TodayPerson) => void;
  busy: boolean;
};

/** The cards peeking under the current one, one per person still in the queue (max two). */
function Peeks({ count, big = false }: { count: number; big?: boolean }) {
  return (
    <>
      {count > 1 && (
        <div
          aria-hidden="true"
          className={`absolute bottom-0 h-10 bg-[#c8cef5] ${big ? "inset-x-9 rounded-b-[30px]" : "inset-x-[30px] rounded-b-[26px]"}`}
        />
      )}
      {count > 0 && (
        <div
          aria-hidden="true"
          className={`absolute h-10 bg-[#8c98ec] ${big ? "inset-x-[18px] bottom-3 rounded-b-[32px]" : "inset-x-[15px] bottom-2.5 rounded-b-[28px]"}`}
        />
      )}
    </>
  );
}

function CategoryPill({ person, withEvery = false }: { person: TodayPerson; withEvery?: boolean }) {
  const { label, icon } = categoryStyle[person.category];
  return (
    <span className="inline-flex h-8 items-center gap-1.5 self-start whitespace-nowrap rounded-full bg-white/15 px-3 text-[13px] font-bold">
      <Icon name={icon} size={15} />
      {withEvery ? `${label}, ${everyLabel(person.intervalDays).toLowerCase()}` : label}
    </span>
  );
}

function LastTalkedChip({ person, className = "" }: { person: TodayPerson; className?: string }) {
  return (
    <span
      className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-white pl-1.5 pr-3.5 text-[13px] font-bold text-ink shadow-float ${className}`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ground text-brand">
        <Icon name="clock" size={15} />
      </span>
      {person.lastTalked}
    </span>
  );
}

function FocusPerson({ person, behind, onTalk, onLater, busy }: { person: TodayPerson; behind: number } & Omit<Props, "queue">) {
  const [note, setNote] = useState("");
  const talk = async () => {
    if (await onTalk(person, note.trim())) setNote("");
  };
  const actions = (large: boolean) => (
    <>
      <CallLink
        name={person.name}
        phone={person.phone}
        className="h-14 w-14 bg-white text-ink shadow-float"
      />
      <button type="button" onClick={() => onLater(person)} disabled={busy} className={buttonClass("white", "lg")}>
        Later
      </button>
      <button type="button" onClick={talk} disabled={busy} className={buttonClass("primary", "lg", large ? "px-9" : "flex-1")}>
        {busy ? "Saving…" : "We talked"}
      </button>
    </>
  );

  return (
    <>
      {/* Phone */}
      <div className="flex flex-col md:hidden">
        {/* The card sizes to its content, so a name on two lines pushes Last talked down instead of under it. */}
        <div className="relative mt-2 pb-5">
          <Peeks count={behind} />
          <article className="relative flex min-h-[212px] flex-col justify-between gap-4 overflow-hidden rounded-[30px] bg-brand p-[22px] text-white shadow-brand">
            <Glow className="-right-20 -top-32 h-64 w-64" />
            <span className="relative">
              <CategoryPill person={person} />
            </span>
            <div className="relative flex flex-col items-start gap-1.5">
              <h2 className="display text-[56px] leading-[0.95] [overflow-wrap:anywhere]">{person.name}</h2>
              <span className="text-[15px] font-medium text-brand-soft">{everyLabel(person.intervalDays)}</span>
              <LastTalkedChip person={person} className="mt-1.5 max-w-full" />
            </div>
          </article>
        </div>
        <section className="glass mt-4 flex flex-col gap-3 rounded-[26px] p-[18px]">
          <h3 className="text-sm font-bold text-muted">For your next call</h3>
          <NextCallList items={person.nextCall} />
          <NoteInput value={note} onChange={setNote} disabled={busy} />
        </section>
        <div className="mt-3.5 flex gap-2.5">{actions(false)}</div>
      </div>

      {/* Desktop */}
      <div className="hidden gap-5 md:grid lg:grid-cols-[1fr_360px]">
        <div className="relative h-[420px]">
          <Peeks count={behind} big />
          <article className="absolute inset-x-0 top-0 flex h-[396px] flex-col gap-4 overflow-hidden rounded-[34px] bg-brand p-7 text-white shadow-brand">
            <Glow className="-right-24 -top-44 h-96 w-96" />
            <div className="relative flex flex-wrap items-center justify-between gap-2">
              <CategoryPill person={person} withEvery />
              <LastTalkedChip person={person} className="h-[34px]" />
            </div>
            <h2 className="display relative mt-auto text-[clamp(64px,8vw,104px)] leading-[0.9] tracking-[-0.06em]">
              {person.name}
            </h2>
            {person.nextCall[0] && (
              <p className="relative max-w-[480px] text-[22px] font-bold leading-snug tracking-tight">{person.nextCall[0]}</p>
            )}
          </article>
        </div>
        <aside className="glass flex flex-col gap-4 rounded-[30px] p-6">
          <h3 className="text-base font-extrabold">What you know</h3>
          {person.aiSummary ? (
            <p className="text-[15px] leading-relaxed">{person.aiSummary}</p>
          ) : (
            <p className="text-[15px] leading-relaxed text-muted">
              Nothing saved yet. After you talk, add a note and it builds up here.
            </p>
          )}
          {person.keyTopics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {person.keyTopics.map((t) => (
                <span key={t} className="flex h-[30px] items-center rounded-full bg-white px-3 text-[13px] font-bold">
                  {t}
                </span>
              ))}
            </div>
          )}
          {person.followUps.length > 0 && (
            <>
              <h3 className="mt-2 text-base font-extrabold">For your next call</h3>
              <NextCallList items={person.followUps} />
            </>
          )}
        </aside>
        <div className="glass flex items-center gap-3 rounded-[30px] p-4 lg:col-span-2">
          <div className="flex-1">
            <NoteInput value={note} onChange={setNote} disabled={busy} large />
          </div>
          {actions(true)}
        </div>
      </div>
    </>
  );
}

export default function FocusMode({ queue, onTalk, onLater, busy }: Props) {
  const [current] = queue;
  return (
    <FocusPerson
      key={current.id}
      person={current}
      behind={Math.min(queue.length - 1, 2)}
      onTalk={onTalk}
      onLater={onLater}
      busy={busy}
    />
  );
}
