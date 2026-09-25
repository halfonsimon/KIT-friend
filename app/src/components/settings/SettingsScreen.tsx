"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import CategoryChip from "@/components/ui/CategoryChip";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/button";
import { saveSettingsAction } from "@/app/(app)/settings/actions";
import { CATEGORY_VALUES } from "@/lib/contact";
import type { AppSettings } from "@/lib/settings";

/** What "Today's email" shows: the same digest the daily email is built from. */
export type EmailPreview = {
  recipient: string;
  subject: string;
  greeting: string;
  due: { id: string; name: string; label: string }[];
  /** Due people beyond the ones listed. */
  moreDue: number;
  upcoming: { id: string; name: string; label: string }[];
  lastSent: string;
};

type Props = {
  initial: AppSettings;
  account: { name: string | null; email: string; provider: string };
  preview: EmailPreview;
};

const GOAL_CHOICES = [1, 2, 3, 5, 8];

type SaveState = "idle" | "saving" | "saved" | "error";

/* ---------- Small pieces ---------- */

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[18px] rounded-[28px] bg-white p-5 shadow-card md:p-[26px]">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-extrabold tracking-[-0.02em]">{title}</h2>
        {description && <p className="text-sm leading-normal text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, hint, children, error }: { label: ReactNode; hint?: string; children: ReactNode; error?: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-ink/[0.07] py-3 last:border-b-0">
      <div className="flex items-center gap-4">
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-bold">{label}</span>
          {hint && <span className="text-[13px] text-muted">{hint}</span>}
        </span>
        {children}
      </div>
      {error && (
        <span role="alert" className="text-[13px] font-semibold text-danger">
          {error}
        </span>
      )}
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const step = "flex h-10 w-10 items-center justify-center rounded-full bg-ground text-lg font-bold hover:bg-ice disabled:opacity-40";
  return (
    <div role="group" aria-label={label} className="flex shrink-0 items-center gap-1.5">
      <button type="button" aria-label="Less" disabled={value <= min} onClick={() => onChange(clamp(value - 1))} className={step}>
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        min={min}
        max={max}
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        className="h-10 w-12 [appearance:textfield] rounded-xl bg-transparent text-center text-base font-extrabold outline-none focus:bg-ground [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" aria-label="More" disabled={value >= max} onClick={() => onChange(clamp(value + 1))} className={step}>
        +
      </button>
      {unit && <span className="ml-1 text-[15px] font-semibold">{unit}</span>}
    </div>
  );
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`flex h-8 w-[52px] shrink-0 rounded-full p-[3px] transition-colors ${
        checked ? "justify-end bg-brand" : "justify-start bg-[#d5d8e6]"
      }`}
    >
      <span className="h-[26px] w-[26px] rounded-full bg-white shadow-sm" />
    </button>
  );
}

const inputClass =
  "h-11 rounded-2xl border-[1.5px] border-field bg-white px-3.5 text-[15px] text-ink outline-none focus:border-brand aria-invalid:border-danger";

/* ---------- "Today's email" ---------- */

function SendNow({ lastSent }: { lastSent: string }) {
  const [state, setState] = useState<{ status: "idle" | "sending" | "ok" | "error"; message: string }>({
    status: "idle",
    message: lastSent,
  });

  const send = async () => {
    setState({ status: "sending", message: "Sending…" });
    try {
      const res = await fetch("/api/digest/send?test=true", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; sent?: string[]; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error || "Couldn’t send it. Try again.");
      setState({ status: "ok", message: `Sent to ${(body.sent ?? []).join(", ")}` });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Couldn’t send it. Try again." });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button type="button" onClick={send} disabled={state.status === "sending"} className={buttonClass("primary", "md")}>
        Send me one now
      </button>
      <span role="status" className={`text-[13px] ${state.status === "error" ? "font-semibold text-danger" : "text-muted"}`}>
        {state.message}
      </span>
    </div>
  );
}

function PreviewList({ items }: { items: EmailPreview["due"] }) {
  return (
    <ul>
      {items.map((p) => (
        <li key={p.id} className="flex justify-between gap-3 border-b border-[#eef0f6] py-2.5 text-sm last:border-b-0">
          <span className="font-bold">{p.name}</span>
          <span className="text-right text-muted">{p.label}</span>
        </li>
      ))}
    </ul>
  );
}

function TodaysEmail({ preview, enabled }: { preview: EmailPreview; enabled: boolean }) {
  return (
    <aside
      id="email-preview"
      aria-labelledby="email-preview-title"
      className="glass flex scroll-mt-6 flex-col gap-4 rounded-[30px] p-5 md:p-6 xl:sticky xl:top-28 xl:mt-16"
    >
      <div className="flex flex-col gap-1">
        <h2 id="email-preview-title" className="text-xl font-extrabold tracking-[-0.02em]">
          Today’s email
        </h2>
        <p className="text-sm text-muted">
          {enabled ? "What the daily email holds right now, with today’s people." : "The daily email is off. This is what it would hold."}
        </p>
      </div>
      <div className="overflow-hidden rounded-[22px] border border-[#e6e8f1] bg-white">
        <div className="flex flex-col gap-0.5 bg-ground px-[18px] py-3.5 text-[13px] text-muted">
          <span>
            <b className="text-ink">KIT Friend</b>, to {preview.recipient}
          </span>
          <span className="text-sm font-bold text-ink">{preview.subject}</span>
        </div>
        <div className="flex flex-col gap-2.5 p-[18px]">
          <span className="text-xl font-extrabold tracking-[-0.02em]">{preview.greeting}</span>
          {preview.due.length > 0 ? (
            <PreviewList items={preview.due} />
          ) : (
            <p className="text-sm text-muted">Nobody is due today.</p>
          )}
          {preview.moreDue > 0 && <span className="text-[13px] text-muted">{preview.moreDue} more are waiting.</span>}
          {preview.upcoming.length > 0 && (
            <>
              <span className="mt-1 text-[13px] font-bold text-muted">Coming up</span>
              <PreviewList items={preview.upcoming} />
            </>
          )}
          <Link href="/" className={buttonClass("brand", "sm", "mt-1 h-10 self-start")}>
            Open Today
          </Link>
        </div>
      </div>
      <SendNow lastSent={preview.lastSent} />
    </aside>
  );
}

/* ---------- The screen ---------- */

export default function SettingsScreen({ initial, account, preview }: Props) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const latest = useRef(initial);
  const saved = useRef(JSON.stringify(initial));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Saves run one after another, so an older save never lands after a newer one.
  const queue = useRef<Promise<void>>(Promise.resolve());

  const persist = () => {
    if (timer.current) clearTimeout(timer.current);
    const snapshot = latest.current;
    const json = JSON.stringify(snapshot);
    if (json === saved.current) return;
    setSaveState("saving");
    queue.current = queue.current.then(async () => {
      try {
        const result = await saveSettingsAction(snapshot);
        if (result.ok) {
          saved.current = json;
          setErrors({});
          if (latest.current === snapshot) setSaveState("saved");
          router.refresh();
        } else {
          setErrors(result.fieldErrors);
          setSaveState("error");
        }
      } catch {
        setSaveState("error");
      }
    });
  };

  /** Change settings; "now" saves at once, "soon" after a short pause, "blur" when the field is left. */
  const change = (patch: Partial<AppSettings>, when: "now" | "soon" | "blur") => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setValues(next);
    if (timer.current) clearTimeout(timer.current);
    if (when === "now") persist();
    else if (when === "soon") timer.current = setTimeout(persist, 500);
  };

  const goals = GOAL_CHOICES.includes(values.dailyGoal) ? GOAL_CHOICES : [...GOAL_CHOICES, values.dailyGoal].sort((a, b) => a - b);
  const statusText = {
    idle: "",
    saving: "Saving…",
    saved: "Saved",
    error: "Not saved. Check the highlighted field.",
  }[saveState];

  return (
    <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[1fr_460px] xl:items-start xl:gap-8">
      <div className="flex flex-col gap-5">
        <div className="mb-2 flex items-end justify-between gap-4">
          <h1 className="display text-[42px] md:text-5xl">Settings</h1>
          <span
            role="status"
            aria-live="polite"
            className={`flex items-center gap-1.5 text-sm font-semibold ${saveState === "error" ? "text-danger" : "text-muted"}`}
          >
            {saveState === "saved" && <Icon name="check" size={16} strokeWidth={3} className="text-brand" />}
            {statusText}
          </span>
        </div>

        <Card title="Daily goal" description="How many people you want to catch up with each day.">
          <div role="group" aria-label="Daily goal" className="flex flex-wrap gap-2">
            {goals.map((n) => {
              const active = n === values.dailyGoal;
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${n} a day`}
                  onClick={() => change({ dailyGoal: n }, "now")}
                  className={`h-[52px] w-[52px] rounded-[18px] text-lg font-extrabold transition-colors ${
                    active ? "bg-brand text-white" : "bg-ground text-ink hover:bg-ice"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <p className="text-[13px] text-muted">Today suggests this many people to start with. You can always keep going.</p>
        </Card>

        <Card title="Daily email">
          <div>
            <Row label="Send me a daily email" hint="A short list of who to catch up with.">
              <Switch
                label="Send me a daily email"
                checked={values.sendEmailDigest}
                onChange={(v) => change({ sendEmailDigest: v }, "now")}
              />
            </Row>
            <Row label="Time" hint="In UTC for now." error={errors.digestTime}>
              <input
                type="time"
                aria-label="Email time"
                value={values.digestTime}
                aria-invalid={!!errors.digestTime}
                onChange={(e) => change({ digestTime: e.target.value }, "blur")}
                onBlur={persist}
                className={`${inputClass} w-36`}
              />
            </Row>
            <Row label="Send to" hint="Leave blank to use your account email." error={errors.digestEmail}>
              <input
                type="email"
                aria-label="Send to"
                placeholder={account.email}
                value={values.digestEmail ?? ""}
                aria-invalid={!!errors.digestEmail}
                onChange={(e) => change({ digestEmail: e.target.value }, "blur")}
                onBlur={persist}
                className={`${inputClass} w-44 min-w-0 md:w-64`}
              />
            </Row>
            <Row label="Coming up" hint="How many upcoming people to list. Due people are always shown." error={errors.upcomingCount}>
              <Stepper
                label="How many coming up to show"
                value={values.upcomingCount}
                min={0}
                max={50}
                onChange={(v) => change({ upcomingCount: v }, "soon")}
              />
            </Row>
          </div>
          <a href="#email-preview" className="text-sm font-bold text-brand hover:text-ink xl:hidden">
            Preview today’s email
          </a>
        </Card>

        <Card
          title="Check-in defaults"
          description="How often to check in with someone new in each category. You can change it per person."
        >
          <div>
            {CATEGORY_VALUES.map((cat) => (
              <Row key={cat} label={<CategoryChip category={cat} />} error={errors[`defaultsByCategory.${cat}`]}>
                <Stepper
                  label={`${cat.charAt(0)}${cat.slice(1).toLowerCase()} default`}
                  value={values.defaultsByCategory[cat]}
                  min={1}
                  max={365}
                  unit="days"
                  onChange={(v) => change({ defaultsByCategory: { ...latest.current.defaultsByCategory, [cat]: v } }, "soon")}
                />
              </Row>
            ))}
          </div>
        </Card>

        <Card title="Account">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex min-w-0 flex-col gap-0.5">
              {account.name && <span className="text-[15px] font-bold">{account.name}</span>}
              <span className="text-sm text-muted">
                {account.email}, {account.provider}
              </span>
            </span>
            <SignOutButton />
          </div>
        </Card>
      </div>

      <TodaysEmail preview={preview} enabled={values.sendEmailDigest} />
    </div>
  );
}
