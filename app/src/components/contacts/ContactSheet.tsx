"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/button";
import { categoryStyle } from "@/components/ui/CategoryChip";
import { createContact, deleteContact, updateContact, type ActionState } from "@/app/(app)/contacts/actions";
import { CATEGORY_VALUES, DEFAULT_CATEGORY, type Category } from "@/lib/contact";
import { INTERVAL_MAX_DAYS, INTERVAL_MIN_DAYS } from "@/lib/interval";

export type EditableContact = {
  id: string;
  name: string;
  phone: string | null;
  category: Category;
  intervalDays: number;
  isActive: boolean;
};

const fieldClass =
  "h-[52px] w-full rounded-2xl border-[1.5px] border-field bg-white px-[18px] text-base text-ink outline-none focus:border-brand";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="text-[13px] font-semibold text-danger">{message}</span>;
}

/**
 * "Add someone" (no `contact`) or "Edit Noa": a side sheet on wide screens,
 * a bottom sheet on phones. Saves, creates and deletes through the contact
 * Server Actions.
 */
export default function ContactSheet({
  contact,
  defaults,
  onClose,
}: {
  contact?: EditableContact;
  defaults: Record<Category, number>;
  onClose: () => void;
}) {
  const adding = !contact;
  const [state, save, saving] = useActionState<ActionState | null, FormData>(adding ? createContact : updateContact, null);
  const [deleteState, remove, deleting] = useActionState<ActionState | null, FormData>(deleteContact, null);
  const [category, setCategory] = useState<Category>(contact?.category ?? DEFAULT_CATEGORY);
  const [paused, setPaused] = useState(contact ? !contact.isActive : false);
  // Adding: the days follow the category's default until the user types their own.
  const [days, setDays] = useState(String(contact?.intervalDays ?? defaults[category]));
  const [daysTyped, setDaysTyped] = useState(!adding);
  const nameRef = useRef<HTMLInputElement>(null);
  const headingId = `contact-sheet-${contact?.id ?? "new"}`;
  const title = contact ? `Edit ${contact.name}` : "Add someone";

  const pickCategory = (cat: Category) => {
    setCategory(cat);
    if (!daysTyped) setDays(String(defaults[cat]));
  };
  const errors = state?.fieldErrors ?? {};
  const message = state?.message ?? deleteState?.message;

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end md:p-4">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative flex max-h-[calc(100dvh-28px)] w-full flex-col gap-4 overflow-y-auto rounded-t-[32px] bg-white px-5 pb-6 pt-3 md:max-h-none md:w-[480px] md:gap-[22px] md:rounded-[32px] md:p-7 md:shadow-[0_40px_80px_-30px_rgba(14,16,36,0.5)]"
      >
        <span aria-hidden="true" className="h-[5px] w-10 self-center rounded-full bg-[#d5d8e6] md:hidden" />
        <div className="flex items-center justify-between">
          <h2 id={headingId} className="text-[26px] font-extrabold tracking-[-0.03em] md:text-[28px]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-ground text-ink hover:bg-ice"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <form action={save} className="flex flex-1 flex-col gap-3.5 md:gap-5">
          {contact && <input type="hidden" name="id" value={contact.id} />}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold">Name</span>
            <input
              ref={nameRef}
              name="name"
              defaultValue={contact?.name}
              placeholder="Their name"
              required
              aria-invalid={!!errors.name}
              className={fieldClass}
            />
            <FieldError message={errors.name} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold">Phone</span>
            <input
              name="phone"
              type="tel"
              defaultValue={contact?.phone ?? ""}
              placeholder="+972 …"
              className={fieldClass}
            />
            <span className="text-[13px] text-muted">Optional. Adds a Call button.</span>
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-bold">Category</legend>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_VALUES.map((cat) => {
                const style = categoryStyle[cat];
                const active = cat === category;
                return (
                  <label
                    key={cat}
                    className={`flex h-11 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
                      active ? "bg-ink text-white" : "bg-ground text-ink hover:bg-ice"
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat}
                      checked={active}
                      onChange={() => pickCategory(cat)}
                      className="sr-only"
                    />
                    <Icon name={style.icon} size={15} />
                    {style.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <label htmlFor={`${headingId}-days`} className="text-sm font-bold">
              Check in every
            </label>
            <div className="flex items-center gap-2.5">
              <input
                id={`${headingId}-days`}
                name="intervalDays"
                type="number"
                min={INTERVAL_MIN_DAYS}
                max={INTERVAL_MAX_DAYS}
                value={days}
                onChange={(e) => {
                  setDays(e.target.value);
                  setDaysTyped(true);
                }}
                aria-label="Days between check-ins"
                aria-invalid={!!errors.intervalDays}
                className={`${fieldClass} w-24!`}
              />
              <span className="text-base font-semibold">days</span>
            </div>
            <span className="text-[13px] text-muted">
              {!daysTyped
                ? `Filled in from your ${categoryStyle[category].label} default.`
                : `Your default for ${categoryStyle[category].label} is ${defaults[category]} days. Leave it empty to use it.`}
            </span>
            <FieldError message={errors.intervalDays} />
          </div>

          {contact ? (
            <div className="flex items-center gap-3.5 rounded-[20px] bg-ground p-4">
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-bold">Pause {contact.name}</span>
                <span className="text-[13px] text-muted">
                  Leave them out of Today and the daily email. They stay in Contacts.
                </span>
              </span>
              {!paused && <input type="hidden" name="isActive" value="on" />}
              <button
                type="button"
                role="switch"
                aria-checked={paused}
                aria-label={`Pause ${contact.name}`}
                onClick={() => setPaused((p) => !p)}
                className={`flex h-8 w-[52px] shrink-0 rounded-full p-[3px] transition-colors ${
                  paused ? "justify-end bg-brand" : "justify-start bg-[#d5d8e6]"
                }`}
              >
                <span className="h-[26px] w-[26px] rounded-full bg-white shadow-sm" />
              </button>
            </div>
          ) : (
            <input type="hidden" name="isActive" value="on" />
          )}

          {message && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {message}
            </p>
          )}

          <div className="flex-1" />
          <div className="flex gap-2.5">
            <button type="submit" disabled={saving || deleting} className={buttonClass("primary", "lg", "flex-1")}>
              {saving ? "Saving…" : adding ? "Add contact" : "Save changes"}
            </button>
            <button type="button" onClick={onClose} className={buttonClass("soft", "lg")}>
              Cancel
            </button>
          </div>
        </form>

        {contact && (
          <form
            action={remove}
            onSubmit={(e) => {
              if (!confirm(`Delete ${contact.name}? Their notes go too. This can't be undone.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={contact.id} />
            <button
              type="submit"
              disabled={saving || deleting}
              className="h-11 w-full rounded-full text-[15px] font-bold text-danger hover:bg-danger/5 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete contact"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
