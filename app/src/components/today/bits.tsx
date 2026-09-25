"use client";

import Icon from "@/components/ui/Icon";
import { appendPhrase, useDictation } from "@/components/useDictation";

export type Mode = "list" | "one";

/** "1 of 3 done" with one segment per person in the Daily goal. */
export function ProgressChip({ done, goal, large = false }: { done: number; goal: number; large?: boolean }) {
  const segments = Math.min(goal, 8);
  const filled = Math.min(done, goal);
  return (
    <div
      className={`inline-flex items-center gap-3 whitespace-nowrap rounded-full bg-white font-bold shadow-float ${
        large ? "h-12 px-[18px] text-[15px]" : "h-9 px-3.5 text-[13px]"
      }`}
    >
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full ${large ? "w-5" : "w-[18px]"} ${
              i < Math.round((filled / goal) * segments) ? "bg-brand" : "bg-[#dcddf0]"
            }`}
          />
        ))}
      </span>
      {Math.min(done, goal)} of {goal} done
    </div>
  );
}

/** List / One at a time switch. Icons only when `compact`. */
export function ModeToggle({
  mode,
  onChange,
  compact = false,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  compact?: boolean;
}) {
  const options: { value: Mode; label: string; icon: "list" | "card" }[] = [
    { value: "list", label: "List", icon: "list" },
    { value: "one", label: "One at a time", icon: "card" },
  ];
  return (
    <div role="group" aria-label="View" className="glass flex rounded-full p-1">
      {options.map((o) => {
        const active = mode === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            aria-label={compact ? o.label : undefined}
            onClick={() => onChange(o.value)}
            className={`flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-colors ${
              compact ? "w-11" : "px-3.5"
            } ${active ? "bg-ink text-white" : "text-ink hover:bg-white/80"}`}
          >
            <Icon name={o.icon} size={compact ? 17 : 16} />
            {!compact && o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Bulleted "For your next call" items, or a hint when memory is still empty. */
export function NextCallList({ items, onBrand = false }: { items: string[]; onBrand?: boolean }) {
  if (items.length === 0) {
    return (
      <p className={`text-[15px] leading-relaxed ${onBrand ? "text-brand-soft" : "text-muted"}`}>
        Nothing yet. Add a note after you talk and KIT Friend will suggest what to ask next time.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex items-baseline gap-2.5 text-base font-semibold leading-snug">
          <span aria-hidden="true" className="h-[7px] w-[7px] shrink-0 -translate-y-0.5 rounded-full bg-brand" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Round call button, only for Contacts with a phone number. */
export function CallLink({ name, phone, className }: { name: string; phone: string | null; className: string }) {
  if (!phone) return null;
  return (
    <a href={`tel:${phone}`} aria-label={`Call ${name}`} className={`flex shrink-0 items-center justify-center rounded-full ${className}`}>
      <Icon name="phone" size={18} />
    </a>
  );
}

/** Single-line note input with the mic, used inline in One at a time. */
export function NoteInput({
  value,
  onChange,
  disabled,
  large = false,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  large?: boolean;
}) {
  const { supported, listening, toggle } = useDictation((phrase) => onChange(appendPhrase(value, phrase)));
  return (
    <div className={`flex items-center gap-2 rounded-full bg-white pl-4 pr-1.5 ${large ? "h-14" : "h-[50px]"}`}>
      <input
        type="text"
        aria-label="Note"
        placeholder="What did you talk about?"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/80"
      />
      {supported && (
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          aria-label={listening ? "Stop dictating" : "Dictate a note"}
          aria-pressed={listening}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            listening ? "bg-brand text-white" : "bg-ground text-ink"
          }`}
        >
          <Icon name="mic" size={18} />
        </button>
      )}
    </div>
  );
}
