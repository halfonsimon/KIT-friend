"use client";

import { useCallback, useMemo, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CategoryChip, { categoryStyle } from "@/components/ui/CategoryChip";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/button";
import { CallLink } from "@/components/today/bits";
import TalkSheet from "@/components/today/TalkSheet";
import type { CardState, ContactCard } from "@/lib/contact-card";
import { Toast, useTalk } from "@/components/talk/useTalk";
import { CATEGORY_VALUES, type Category } from "@/lib/contact";
import ContactSheet from "./ContactSheet";

type StatusFilter = "any" | CardState;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "due", label: "Due now" },
  { value: "upToDate", label: "Up to date" },
  { value: "paused", label: "Paused" },
];

const matchesStatus = (status: StatusFilter) => (c: ContactCard) => status === "any" || c.state === status;

const SHOWN_AT_FIRST = 14;

function peopleCount(n: number) {
  return `${n} ${n === 1 ? "person" : "people"}`;
}

/* ---------- Desktop: filters in a side column ---------- */

function FilterGroup<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { value: T; label: string; count: number; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={title} className="glass flex flex-col gap-0.5 rounded-3xl p-2.5">
      <h2 className="mx-3.5 my-1.5 text-[13px] font-bold text-muted">{title}</h2>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`flex h-11 items-center gap-2.5 rounded-[14px] px-3.5 text-left text-[15px] ${
              active ? "bg-white font-extrabold shadow-[0_10px_24px_-18px_rgba(30,40,120,0.5)]" : "font-semibold hover:bg-white/60"
            }`}
          >
            {o.icon}
            <span className="flex-1">{o.label}</span>
            <span className="text-sm font-semibold text-muted">{o.count}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Phone: a row you can swipe right for "We talked" ---------- */

const SWIPE_TRIGGER = 110;

function SwipeRow({
  person,
  busy,
  onTalk,
  onSwipeTalk,
}: {
  person: ContactCard;
  busy: boolean;
  onTalk: () => void;
  onSwipeTalk: () => void;
}) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const style = categoryStyle[person.category];

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerMove = (e: PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const x = e.clientX - s.x;
    // A mostly vertical move is a scroll: let it go.
    if (dx === 0 && Math.abs(e.clientY - s.y) > Math.abs(x)) {
      start.current = null;
      return;
    }
    setDx(Math.max(0, Math.min(x, 160)));
  };
  const onPointerEnd = () => {
    if (dx >= SWIPE_TRIGGER && !busy) onSwipeTalk();
    start.current = null;
    setDx(0);
  };

  return (
    <li className="relative -mx-4 overflow-hidden border-b border-ink/[0.07] last:border-b-0">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 flex items-center gap-2 pl-5 text-sm font-bold text-white ${
          dx > 0 ? "right-0 bg-brand" : "hidden"
        }`}
      >
        <Icon name="check" size={18} strokeWidth={3} />
        We talked
      </span>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
        className={`relative flex h-16 touch-pan-y items-center gap-3 bg-white px-4 ${
          dx ? "shadow-[-12px_0_24px_-12px_rgba(14,16,36,0.35)]" : "transition-transform"
        }`}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.chip}`}>
          <Icon name={style.icon} size={17} />
        </span>
        <Link href={`/contacts/${person.id}`} className="flex min-w-0 flex-1 flex-col text-ink">
          <span className={`truncate text-base font-bold ${person.state === "paused" ? "text-muted" : ""}`}>{person.name}</span>
          <span className="truncate text-[13px] text-muted">
            {person.state === "paused" ? `Paused · ${person.lastTalkedShort}` : person.lastTalkedShort}
          </span>
        </Link>
        <button type="button" onClick={onTalk} disabled={busy} className={buttonClass("soft", "sm", "h-10 px-3.5 text-[13px]")}>
          We talked
        </button>
      </div>
    </li>
  );
}

/* ---------- The screen ---------- */

export default function ContactsScreen({
  contacts,
  defaults,
  adding = false,
}: {
  contacts: ContactCard[];
  defaults: Record<Category, number>;
  /** Open with the "Add someone" sheet (at /contacts/new). */
  adding?: boolean;
}) {
  const router = useRouter();
  const { talk, undo, toast, busyId } = useTalk();
  const [talkingTo, setTalkingTo] = useState<ContactCard | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("any");
  const [showAll, setShowAll] = useState(false);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? contacts.filter((c) => c.name.toLowerCase().includes(q)) : contacts;
  }, [contacts, query]);

  const statusMatch = matchesStatus(status);
  const inCategory = (c: ContactCard) => category === "all" || c.category === category;
  const visible = searched.filter((c) => inCategory(c) && statusMatch(c));
  const shown = showAll ? visible : visible.slice(0, SHOWN_AT_FIRST);

  const categoryOptions = [
    { value: "all" as const, label: "Everyone", count: searched.filter(statusMatch).length },
    ...CATEGORY_VALUES.map((cat) => ({
      value: cat,
      label: categoryStyle[cat].label,
      count: searched.filter((c) => c.category === cat && statusMatch(c)).length,
      icon: (
        <span className={`flex ${categoryStyle[cat].ink}`}>
          <Icon name={categoryStyle[cat].icon} size={16} />
        </span>
      ),
    })),
  ];
  const statusOptions = STATUS_FILTERS.map((f) => ({
    value: f.value,
    label: f.label,
    count: searched.filter((c) => inCategory(c) && matchesStatus(f.value)(c)).length,
  }));

  // Phone chips: one row mixing the categories and Paused, like the design.
  const chipValue = status === "paused" ? "paused" : category;
  const chips = [
    ...categoryOptions.map((o) => ({ value: o.value as string, label: o.label, count: o.count })),
    { value: "paused", label: "Paused", count: searched.filter(matchesStatus("paused")).length },
  ];
  const pickChip = (v: string) => {
    if (v === "paused") {
      setCategory("all");
      setStatus("paused");
    } else {
      setCategory(v as Category | "all");
      setStatus("any");
    }
  };

  const openTalk = useCallback((c: ContactCard) => setTalkingTo(c), []);
  const closeSheet = useCallback(() => setTalkingTo(null), []);
  const closeAdd = useCallback(() => router.replace("/contacts", { scroll: false }), [router]);

  const search = (
    <label className="flex h-12 flex-1 items-center gap-2.5 rounded-full bg-white px-[18px] text-muted shadow-[0_10px_30px_-20px_rgba(30,40,120,0.4)] xl:h-[52px]">
      <Icon name="search" size={18} />
      <input
        type="search"
        aria-label="Search contacts"
        placeholder="Search by name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/80"
      />
    </label>
  );

  const empty = (
    <p className="px-2 py-10 text-center text-[15px] text-muted">
      {contacts.length === 0 ? (
        <>
          No contacts yet.{" "}
          <Link href="/contacts/new" className="font-bold text-brand">
            Add the first one
          </Link>
          .
        </>
      ) : (
        "Nobody matches. Try another name or filter."
      )}
    </p>
  );

  const more = !showAll && visible.length > shown.length && (
    <button
      type="button"
      onClick={() => setShowAll(true)}
      className="flex h-[50px] w-full items-center justify-center border-t border-ink/[0.07] text-[15px] font-bold text-brand hover:text-ink"
    >
      Show {visible.length - shown.length} more
    </button>
  );

  return (
    <div className="xl:grid xl:grid-cols-[280px_1fr] xl:items-start xl:gap-10">
      {/* Title, and on wide screens the filters */}
      <aside className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1 xl:gap-1.5">
            <h1 className="display text-[42px] xl:text-5xl">Contacts</h1>
            <span className="text-sm text-muted xl:text-base">{peopleCount(contacts.length)}</span>
          </div>
          <Link
            href="/contacts/new"
            aria-label="Add contact"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-strong md:hidden"
          >
            <Icon name="plus" size={20} />
          </Link>
        </div>
        <div className="hidden flex-col gap-6 xl:flex">
          <FilterGroup title="Category" options={categoryOptions} value={category} onChange={setCategory} />
          <FilterGroup title="Status" options={statusOptions} value={status} onChange={setStatus} />
        </div>
      </aside>

      <main className="mt-[18px] flex flex-col gap-3 xl:mt-0 xl:gap-[18px]">
        <div className="flex items-center gap-3">
          {search}
          <span className="hidden whitespace-nowrap text-sm text-muted xl:inline">Longest wait first</span>
        </div>

        {/* Phone and tablet: filter chips and swipeable rows */}
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 xl:hidden" role="group" aria-label="Filter">
          {chips.map((c) => {
            const active = c.value === chipValue;
            return (
              <button
                key={c.value}
                type="button"
                aria-pressed={active}
                onClick={() => pickChip(c.value)}
                className={`flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-bold ${
                  active ? "bg-ink text-white" : "bg-white text-ink"
                }`}
              >
                {c.label}
                <span className="font-semibold opacity-70">{c.count}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-1 overflow-hidden rounded-3xl bg-white px-4 xl:hidden">
          {shown.length === 0 ? (
            empty
          ) : (
            <ul>
              {shown.map((c) => (
                <SwipeRow
                  key={c.id}
                  person={c}
                  busy={busyId === c.id}
                  onTalk={() => openTalk(c)}
                  onSwipeTalk={() => talk(c, "")}
                />
              ))}
            </ul>
          )}
          {more}
        </div>

        {/* Wide screens: the table */}
        <div className="glass hidden rounded-[28px] px-6 pt-1 xl:block">
          <div
            aria-hidden="true"
            className="grid h-11 grid-cols-[1fr_130px_150px_190px_110px_44px_120px] items-center gap-3 border-b border-ink/[0.07] text-[13px] font-bold text-muted"
          >
            <span>Name</span>
            <span>Category</span>
            <span>Check in</span>
            <span>Last talked</span>
            <span>Next</span>
          </div>
          {shown.length === 0 ? (
            empty
          ) : (
            <ul>
              {shown.map((c) => (
                <li
                  key={c.id}
                  className="grid h-[60px] grid-cols-[1fr_130px_150px_190px_110px_44px_120px] items-center gap-3 border-b border-ink/[0.07] last:border-b-0"
                >
                  <Link
                    href={`/contacts/${c.id}`}
                    className={`truncate text-base font-bold hover:text-brand ${c.state === "paused" ? "text-muted" : "text-ink"}`}
                  >
                    {c.name}
                  </Link>
                  <span>
                    <CategoryChip category={c.category} />
                  </span>
                  <span className="text-sm text-muted">{c.every}</span>
                  <span className="truncate text-sm text-muted">{c.lastTalked}</span>
                  <span className={`text-sm font-bold ${c.state === "due" ? "text-brand" : "text-muted"}`}>
                    {c.nextDue}
                  </span>
                  <span>
                    <CallLink name={c.name} phone={c.phone} className="h-11 w-11 text-ink hover:bg-white" />
                  </span>
                  <button
                    type="button"
                    onClick={() => openTalk(c)}
                    disabled={busyId === c.id}
                    aria-label={`We talked with ${c.name}`}
                    className={buttonClass("soft", "sm")}
                  >
                    We talked
                  </button>
                </li>
              ))}
            </ul>
          )}
          {more}
        </div>
      </main>

      {talkingTo && (
        <TalkSheet
          person={talkingTo}
          saving={busyId === talkingTo.id}
          onClose={closeSheet}
          onSubmit={async (note) => {
            if (await talk(talkingTo, note)) setTalkingTo(null);
          }}
        />
      )}
      {adding && <ContactSheet defaults={defaults} onClose={closeAdd} />}
      <Toast toast={toast} onUndo={undo} />
    </div>
  );
}
