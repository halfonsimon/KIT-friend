"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/(app)/contacts/actions";

type Props = {
  contactId: string;
  contactName: string;
  action: (state: ActionState | null, fd: FormData) => Promise<ActionState>;
};

export default function DeleteButton({ contactId, contactName, action }: Props) {
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
          className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 hover:border-red-300"
          title={`Delete ${contactName}`}
        >
          Delete
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
