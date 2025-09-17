"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/(app)/contacts/actions";

type Props = {
  contactId: string;
  contactName: string;
  action: (state: ActionState | null, fd: FormData) => Promise<ActionState>;
};

export default function DeleteButton({
  contactId,
  contactName,
  action,
}: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {
    ok: true,
  });

  const handleDelete = (e: React.FormEvent) => {
    const confirmed = confirm(
      `Delete "${contactName}"? This cannot be undone.`
    );
    if (!confirmed) {
      e.preventDefault();
    }
  };

  return (
    <>
      <form action={formAction} onSubmit={handleDelete} className="inline">
        <input type="hidden" name="id" value={contactId} />
        <button
          type="submit"
          className="inline-flex items-center justify-center p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-200"
          title={`Delete ${contactName}`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </form>
      {state?.message && !state.ok && (
        <div className="absolute z-10 mt-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-600 shadow-lg">
          {state.message}
        </div>
      )}
    </>
  );
}
