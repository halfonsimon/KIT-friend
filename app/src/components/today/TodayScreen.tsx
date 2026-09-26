"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import BrandMark from "@/components/ui/BrandMark";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/button";
import { categoryStyle } from "@/components/ui/CategoryChip";
import { ModeToggle, ProgressChip, type Mode } from "./bits";
import FocusMode from "./FocusMode";
import ListMode, { Glow } from "./ListMode";
import TalkSheet from "./TalkSheet";
import { Toast, useTalk } from "@/components/talk/useTalk";
import { categoryAndLastTalked, numberWord } from "@/components/wording";
import type { ContactCard } from "@/lib/contact-card";

type Props = {
  firstName: string | null;
  dateLabel: string;
  dailyGoal: number;
  doneToday: number;
  suggested: ContactCard[];
  others: ContactCard[];
  goalMet: boolean;
  hasContacts: boolean;
};

/* ---------- The chosen mode, remembered per device ---------- */

const MODE_KEY = "kf:today-mode";
const MODE_EVENT = "kf:today-mode";

function readMode(): Mode {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    if (stored === "list" || stored === "one") return stored;
  } catch {
    // Storage can be unavailable (private mode); fall back to the device default.
  }
  // First visit: phones start One at a time, bigger screens start with the List.
  return window.matchMedia("(min-width: 768px)").matches ? "list" : "one";
}

function subscribeMode(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(MODE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(MODE_EVENT, onChange);
  };
}

function useMode(): [Mode, (m: Mode) => void] {
  const mode = useSyncExternalStore(subscribeMode, readMode, () => "list" as const);
  const setMode = useCallback((m: Mode) => {
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      // Not remembered, but still switch for this visit.
    }
    window.dispatchEvent(new Event(MODE_EVENT));
  }, []);
  return [mode, setMode];
}

/* ---------- Small pieces ---------- */

function peopleWord(n: number) {
  return n === 1 ? "person" : "people";
}

function DoneCard({ goal, waiting, onKeepGoing }: { goal: number; waiting: number; onKeepGoing?: () => void }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="relative flex min-h-[300px] flex-col gap-3.5 overflow-hidden rounded-[30px] bg-brand p-6 text-white shadow-brand">
        <Glow className="-right-20 -top-36 h-72 w-72" />
        <span className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text-brand">
          <Icon name="check" size={26} strokeWidth={3} />
        </span>
        <h2 className="display relative mt-auto text-[44px]">
          That’s your {goal === 1 ? "one" : goal} for today.
        </h2>
        <p className="relative text-base leading-relaxed text-brand-soft">
          Their next check-ins are already scheduled.
        </p>
      </div>
      <div className="flex gap-2.5">
        {onKeepGoing && waiting > 0 && (
          <button type="button" onClick={onKeepGoing} className={buttonClass("primary", "lg", "flex-1")}>
            Keep going
          </button>
        )}
        <Link href="/contacts" className={buttonClass("white", "lg", "flex-1")}>
          See everyone
        </Link>
      </div>
      {waiting > 0 && (
        <p className="text-center text-sm leading-relaxed text-muted">
          {waiting} {peopleWord(waiting)} still waiting. No rush: {goal} more tomorrow.
        </p>
      )}
    </section>
  );
}

function EmptyState({ hasContacts }: { hasContacts: boolean }) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-[30px] bg-white p-7 shadow-card">
      <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-ice text-brand">
        <Icon name={hasContacts ? "check" : "contacts"} size={24} />
      </span>
      <h2 className="display text-[32px]">{hasContacts ? "You’re all caught up." : "Who do you want to keep in touch with?"}</h2>
      <p className="max-w-md text-base leading-relaxed text-muted">
        {hasContacts
          ? "Nobody is due today. KIT Friend will bring people back here when it’s time to check in."
          : "Add a few people and how often you want to check in. Today will suggest who to call each day."}
      </p>
      <Link href={hasContacts ? "/contacts" : "/contacts/new"} className={buttonClass(hasContacts ? "soft" : "brand", "md")}>
        {!hasContacts && <Icon name="plus" size={18} />}
        {hasContacts ? "See everyone" : "Add someone"}
      </Link>
    </section>
  );
}

function AllSkipped({ onRestart }: { onRestart: () => void }) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-[30px] bg-white p-7 shadow-card">
      <h2 className="display text-[32px]">You’ve set everyone aside for now.</h2>
      <p className="text-base text-muted">They’ll be here next time you open Today.</p>
      <button type="button" onClick={onRestart} className={buttonClass("soft", "md")}>
        Start again
      </button>
    </section>
  );
}

/* ---------- The screen ---------- */

export default function TodayScreen({ firstName, dateLabel, dailyGoal, doneToday, suggested, others, goalMet, hasContacts }: Props) {
  const [mode, setMode] = useMode();
  const { talk, undo, toast, busyId } = useTalk();
  const [talkingTo, setTalkingTo] = useState<ContactCard | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [keepGoing, setKeepGoing] = useState(false);

  const dueCount = suggested.length + others.length;
  const showDone = goalMet && !keepGoing;
  const queue = [...suggested, ...others].filter((p) => !skipped.includes(p.id));

  const closeSheet = useCallback(() => setTalkingTo(null), []);

  const greeting = firstName ? `Hi ${firstName}.` : "Hi there.";
  const subline = !hasContacts
    ? "Let’s add the people you want to keep in touch with."
    : dueCount === 0
      ? "Everyone is up to date."
      : doneToday > 0 && !goalMet
        ? `${doneToday} done. ${suggested.length} more for today’s goal.`
        : `${dueCount} ${peopleWord(dueCount)} haven’t heard from you in a while. ${numberWord(dailyGoal)} today is a good start.`;

  const worthAsking = suggested.filter((p) => p.nextCall.length > 0).slice(0, 3);
  const comingUp = queue.slice(1, 3);

  let content: React.ReactNode;
  if (dueCount === 0 && !goalMet) {
    content = <EmptyState hasContacts={hasContacts} />;
  } else if (mode === "one") {
    if (showDone) {
      content = <DoneCard goal={dailyGoal} waiting={others.length} onKeepGoing={() => setKeepGoing(true)} />;
    } else if (queue.length === 0) {
      content = <AllSkipped onRestart={() => setSkipped([])} />;
    } else {
      content = (
        <FocusMode
          queue={queue}
          busy={busyId !== null}
          onTalk={talk}
          onLater={(p) => setSkipped((s) => [...s, p.id])}
        />
      );
    }
  } else {
    content = (
      <div className="flex flex-col gap-9">
        {goalMet && <DoneCard goal={dailyGoal} waiting={0} />}
        <ListMode suggested={suggested} others={others} onTalk={setTalkingTo} busyId={busyId} />
      </div>
    );
  }

  return (
    <div className="xl:grid xl:grid-cols-[400px_1fr] xl:items-start xl:gap-14">
      {/* Phone header */}
      <header className="flex flex-col gap-5 md:hidden">
        <div className="flex items-center gap-2.5">
          <BrandMark size={32} />
          <span className="text-sm font-semibold text-muted">{dateLabel}</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-3">
            <h1 className="display text-[42px] tracking-[-0.045em]">Today</h1>
            {hasContacts && <ProgressChip done={doneToday} goal={dailyGoal} />}
          </div>
          {hasContacts && <ModeToggle mode={mode} onChange={setMode} compact />}
        </div>
      </header>

      {/* Desktop intro: on wide screens a left column, otherwise above the content */}
      <section className="hidden flex-col gap-5 md:flex xl:sticky xl:top-28 xl:pt-3">
        <span className="text-base font-semibold text-muted">{dateLabel}</span>
        <h1 className="display text-[60px] leading-[1.02] tracking-[-0.045em]">{greeting}</h1>
        <p className="max-w-[400px] text-lg leading-relaxed text-muted">{subline}</p>
        {hasContacts && (
          <div className="flex flex-wrap items-center gap-2.5">
            <ProgressChip done={doneToday} goal={dailyGoal} large />
            <ModeToggle mode={mode} onChange={setMode} />
          </div>
        )}
        {mode === "list" && worthAsking.length > 0 && (
          <div className="mt-6 hidden flex-col gap-3 xl:flex">
            <h2 className="text-lg font-extrabold tracking-tight">Worth asking about</h2>
            <ul className="flex flex-col gap-2.5">
              {worthAsking.map((p, i) => (
                <li
                  key={p.id}
                  style={{ marginLeft: [0, 40, 16][i] }}
                  className="flex w-fit max-w-full items-center gap-3 rounded-full bg-white py-2.5 pl-2.5 pr-5 shadow-float"
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${categoryStyle[p.category].chip}`}
                  >
                    <Icon name={categoryStyle[p.category].icon} size={20} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[15px] font-extrabold">{p.name}</span>
                    <span className="truncate text-sm text-muted">{p.nextCall[0]}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {mode === "one" && !showDone && comingUp.length > 0 && (
          <div className="mt-6 hidden flex-col gap-3 xl:flex">
            <h2 className="text-lg font-extrabold tracking-tight">Coming up</h2>
            <ul className="flex flex-col gap-2">
              {comingUp.map((p, i) => (
                <li key={p.id} className="glass flex h-16 items-center gap-3 rounded-[20px] px-[18px]">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-extrabold">{p.name}</span>
                    <span className="truncate text-[13px] text-muted">
                      {categoryAndLastTalked(categoryStyle[p.category].label, p)}
                    </span>
                  </span>
                  <span className="text-[13px] font-bold text-muted">{i === 0 ? "Next" : "After that"}</span>
                </li>
              ))}
            </ul>
            {queue.length > 3 && <p className="text-sm font-bold text-brand">{queue.length - 3} more after that</p>}
          </div>
        )}
      </section>

      <div className="mt-7 md:mt-10 xl:mt-0">{content}</div>

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
      <Toast toast={toast} onUndo={undo} />
    </div>
  );
}
