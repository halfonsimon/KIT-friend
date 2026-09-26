"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/button";
import { categoryStyle } from "@/components/ui/CategoryChip";
import { appendPhrase, useDictation } from "@/components/useDictation";
import { categoryAndLastTalked } from "@/components/wording";
import type { ContactCard } from "@/lib/contact-card";

type Props = {
  person: ContactCard;
  saving: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
};

/** "You talked with …": one note box (with the mic) and one button. */
export default function TalkSheet({ person, saving, onClose, onSubmit }: Props) {
  const [note, setNote] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { supported, listening, toggle, stop } = useDictation((phrase) => setNote((n) => appendPhrase(n, phrase)));
  const hasNote = note.trim().length > 0;

  useEffect(() => {
    textareaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    stop();
    onSubmit(note);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="talk-title"
        className="relative flex w-full flex-col gap-4 rounded-t-[32px] bg-white px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3 md:max-w-[480px] md:rounded-[32px] md:p-[26px] md:shadow-card"
      >
        <span aria-hidden="true" className="h-[5px] w-10 self-center rounded-full bg-field md:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="talk-title" className="text-[26px] font-extrabold leading-tight tracking-tight">
              You talked with {person.name}
            </h2>
            <p className="text-sm text-muted">
              {categoryAndLastTalked(categoryStyle[person.category].label, person)}
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className={buttonClass("soft", "sm", "w-11 px-0")}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="relative">
          <textarea
            ref={textareaRef}
            aria-label="Note"
            placeholder="What did you talk about? (optional)"
            value={note}
            disabled={saving}
            onChange={(e) => setNote(e.target.value)}
            className={`h-[150px] w-full resize-none rounded-[20px] border-[1.5px] bg-white px-[18px] pb-14 pt-4 text-base leading-normal outline-none md:h-[130px] ${
              hasNote ? "border-brand" : "border-field"
            }`}
          />
          {supported && (
            <button
              type="button"
              onClick={toggle}
              disabled={saving}
              aria-label={listening ? "Stop dictating" : "Dictate a note"}
              aria-pressed={listening}
              className={`absolute bottom-2.5 right-2.5 flex h-[42px] w-[42px] items-center justify-center rounded-full ${
                listening || hasNote ? "bg-brand text-white" : "bg-ground text-ink"
              }`}
            >
              <Icon name="mic" size={18} />
            </button>
          )}
        </div>
        <p className="text-[13px] text-muted">
          {listening ? "Listening… speak now." : `Your note updates what you know about ${person.name}.`}
        </p>
        <button type="button" onClick={submit} disabled={saving} className={buttonClass("primary", "lg")}>
          {saving ? "Saving…" : hasNote ? "Save note" : "Mark as talked"}
        </button>
      </div>
    </div>
  );
}
