"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/button";
import { categoryStyle } from "@/components/ui/CategoryChip";
import { Glow } from "@/components/today/ListMode";
import { NextCallList } from "@/components/today/bits";
import { lowerFirst } from "@/components/wording";
import type { ContactCard } from "@/lib/contact-card";
import { useWeTalked } from "@/components/talk/WeTalked";
import type { Category } from "@/lib/contact";
import ContactSheet from "./ContactSheet";

export type ContactNote = { id: string; date: string; note: string };

type Props = {
  person: ContactCard;
  notes: ContactNote[];
  /** "4 talks since February", or null without notes. */
  notesSummary: string | null;
  defaults: Record<Category, number>;
  editing: boolean;
};

function WhatYouKnow({ person }: { person: ContactCard }) {
  const hasMemory = person.aiSummary || person.keyTopics.length > 0;
  return (
    <section className="flex flex-col gap-4 rounded-[28px] bg-white p-5 shadow-card md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold tracking-[-0.02em]">What you know</h2>
        <span className="text-[13px] text-muted">Updated from your notes</span>
      </div>
      {hasMemory ? (
        <>
          {person.aiSummary && <p className="text-[15px] leading-relaxed">{person.aiSummary}</p>}
          {person.keyTopics.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {person.keyTopics.map((t) => (
                <li key={t} className="flex h-[30px] items-center rounded-full bg-ground px-3 text-[13px] font-bold">
                  {t}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="text-[15px] leading-relaxed text-muted">
          Nothing yet. After you talk, add a note and KIT Friend will keep a short summary here.
        </p>
      )}
      <h3 className="mt-1.5 text-[15px] font-extrabold">For your next call</h3>
      <NextCallList items={person.followUps} />
    </section>
  );
}

function Notes({ notes, summary }: { notes: ContactNote[]; summary: string | null }) {
  return (
    <section className="glass flex flex-col gap-4 rounded-[28px] p-5 md:gap-[18px] md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold tracking-[-0.02em]">Your notes</h2>
        {summary && <span className="text-[13px] text-muted">{summary}</span>}
      </div>
      {notes.length === 0 ? (
        <p className="text-[15px] leading-relaxed text-muted">No notes yet. Notes you add after “We talked” show up here.</p>
      ) : (
        <ol>
          {notes.map((n, i) => (
            <li key={n.id} className="relative flex flex-col gap-1 pb-5 pl-8 last:pb-0">
              {i < notes.length - 1 && (
                <span aria-hidden="true" className="absolute -bottom-1.5 left-[7px] top-[22px] w-0.5 bg-[#e1e3ee]" />
              )}
              <span aria-hidden="true" className="absolute left-0 top-1 h-4 w-4 rounded-full bg-brand" />
              <span className="text-[13px] font-bold text-muted">{n.date}</span>
              <span className="whitespace-pre-line text-[15px] leading-normal">{n.note}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** One Contact: who they are, what you know, your notes, and Edit. */
export default function ContactScreen({ person, notes, notesSummary, defaults, editing }: Props) {
  const router = useRouter();
  const { open, busyId, view } = useWeTalked();
  const [editOpen, setEditOpen] = useState(editing);
  const style = categoryStyle[person.category];

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    // Drop ?edit=1 so a reload doesn't reopen the sheet.
    if (editing) router.replace(`/contacts/${person.id}`, { scroll: false });
  }, [editing, person.id, router]);

  return (
    <div className="flex flex-col gap-3.5 md:gap-[22px]">
      {/* Top: back, and Edit on phones */}
      <div className="flex items-center justify-between">
        <Link
          href="/contacts"
          aria-label="Back to Contacts"
          className="glass flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-ink md:h-10 md:pl-2.5 md:pr-3.5"
        >
          <Icon name="back" size={20} />
          <span className="hidden md:inline">Contacts</span>
        </Link>
        <button type="button" onClick={() => setEditOpen(true)} className={buttonClass("glass", "sm", "md:hidden")}>
          Edit
        </button>
      </div>

      <article className="relative overflow-hidden rounded-[30px] bg-brand text-white shadow-brand md:rounded-[34px]">
        <Glow className="-right-24 -top-36 h-80 w-80" />
        <div className="relative flex flex-col gap-4 p-[22px] md:gap-[22px] md:px-8 md:py-[30px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-8 items-center gap-1.5 rounded-full bg-white/15 px-3 text-[13px] font-bold md:h-[34px] md:px-3.5 md:text-sm">
              <Icon name={style.icon} size={15} />
              {style.label}, {lowerFirst(person.every)}
            </span>
            {person.state === "paused" && (
              <span className="flex h-8 items-center rounded-full bg-white/15 px-3 text-[13px] font-bold md:h-[34px] md:text-sm">
                Paused
              </span>
            )}
            <span className="hidden h-[34px] items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-bold text-ink md:flex">
              <Icon name="clock" size={15} />
              {person.lastTalkedShort}
            </span>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="display break-words text-[60px] leading-[0.92] tracking-[-0.055em] md:text-[112px] md:leading-[0.88] md:tracking-[-0.06em]">
                {person.name}
              </h1>
              <span className="text-[15px] text-brand-soft md:hidden">{person.lastTalked}</span>
            </div>
            <div className="flex gap-2 md:gap-2.5">
              <button type="button" onClick={() => setEditOpen(true)} className={buttonClass("onBrand", "md", "hidden h-[52px] md:inline-flex")}>
                <Icon name="edit" size={18} />
                Edit
              </button>
              {person.phone && (
                <a
                  href={`tel:${person.phone}`}
                  aria-label={`Call ${person.name}`}
                  className={buttonClass("onBrand", "md", "h-[52px] w-[52px] px-0 md:w-auto md:px-5")}
                >
                  <Icon name="phone" size={18} />
                  <span className="hidden md:inline">Call</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => open(person)}
                disabled={busyId === person.id}
                className={buttonClass("white", "md", "h-[52px] flex-1 text-base shadow-none md:flex-none md:px-7 md:text-[15px]")}
              >
                We talked
              </button>
            </div>
          </div>
        </div>
      </article>

      <div className="flex flex-col gap-3.5 md:grid md:grid-cols-2 md:items-start md:gap-[22px]">
        <WhatYouKnow person={person} />
        <Notes notes={notes} summary={notesSummary} />
      </div>

      {editOpen && (
        <ContactSheet
          contact={{
            id: person.id,
            name: person.name,
            phone: person.phone,
            category: person.category,
            intervalDays: person.intervalDays,
            isActive: person.state !== "paused",
          }}
          defaults={defaults}
          onClose={closeEdit}
        />
      )}
      {view}
    </div>
  );
}
