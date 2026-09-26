"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/button";
import type { ContactCard } from "@/lib/contact-card";
import TalkSheet from "./TalkSheet";

/** What the toast shows: a message, and for a fresh Touch its Undo value. */
type ToastState = {
  message: string;
  undo?: { contactId: string; value: string };
};

function Toast({ toast, onUndo }: { toast: ToastState | null; onUndo: () => void }) {
  // The live region is the message alone, always mounted so screen readers
  // announce each new one; Undo sits beside it.
  return (
    <div className="pointer-events-none fixed inset-x-5 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+5rem)] z-50 flex justify-center md:bottom-8">
      <div
        className={
          toast
            ? `pointer-events-auto flex h-14 max-w-full items-center gap-3 rounded-full bg-ink pl-4 text-[15px] font-semibold text-white shadow-card ${
                toast.undo ? "pr-2" : "pr-6"
              }`
            : "sr-only"
        }
      >
        {toast && (
          <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-brand">
            <Icon name="check" size={14} strokeWidth={3} />
          </span>
        )}
        <span role="status" aria-live="polite" className="truncate">
          {toast?.message}
        </span>
        {toast?.undo && (
          <button type="button" onClick={onUndo} className={buttonClass("onBrand", "sm", "ml-auto h-10")}>
            Undo
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * "We talked" on any screen: the note sheet, saving the Touch, the busy state,
 * the toast with Undo and the refresh after each. A screen calls `open` to ask
 * for a note first, or `talk` to save straight away (with the note it already
 * has), and renders `view` once.
 */
export function useWeTalked() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [talkingTo, setTalkingTo] = useState<ContactCard | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    // Long enough to reach Undo after "We talked".
    const t = setTimeout(() => setToast(null), toast.undo ? 7000 : 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /** Record a Touch; returns whether it was saved. */
  const talk = useCallback(
    async (person: { id: string; name: string }, note: string) => {
      setBusyId(person.id);
      try {
        const res = await fetch(`/api/contacts/${person.id}/touch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.ok) throw new Error(`HTTP ${res.status}`);
        // The Touch module trims too; this is only for the wording.
        setToast({
          message: note.trim() ? `Note saved for ${person.name}` : `${person.name} marked as talked`,
          undo: { contactId: person.id, value: body.data.undo },
        });
        startTransition(() => router.refresh());
        return true;
      } catch {
        setToast({ message: "Couldn’t save. Check your connection and try again." });
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [router]
  );

  /** Take back the last Touch: its date goes back and its note is dropped. */
  const undo = useCallback(async () => {
    const last = toast?.undo;
    if (!last) return;
    setToast(null);
    const res = await fetch(`/api/contacts/${last.contactId}/touch`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ undo: last.value }),
    }).catch(() => null);
    if (!res?.ok) setToast({ message: "Couldn’t undo. It was saved." });
    startTransition(() => router.refresh());
  }, [toast, router]);

  const close = useCallback(() => setTalkingTo(null), []);

  const view = (
    <>
      {talkingTo && (
        <TalkSheet
          person={talkingTo}
          saving={busyId === talkingTo.id}
          onClose={close}
          onSubmit={async (note) => {
            if (await talk(talkingTo, note)) setTalkingTo(null);
          }}
        />
      )}
      <Toast toast={toast} onUndo={undo} />
    </>
  );

  return { open: setTalkingTo, talk, busyId, view };
}
