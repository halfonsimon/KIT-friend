"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/(app)/contacts/actions";
import { CategoryEnum } from "@/lib/validation";

type InitialValues = {
  id?: string;
  name?: string;
  phone?: string | null;
  category?: "FAMILY" | "FRIEND" | "WORK" | "OTHER";
  intervalDays?: number;
  isActive?: boolean;
};

type Props = {
  action: (state: ActionState | null, fd: FormData) => Promise<ActionState>;
  initialValues?: InitialValues;
  submitLabel: string;
  showActiveToggle?: boolean; // show on edit
};

export default function ContactForm({
  action,
  initialValues,
  submitLabel,
  showActiveToggle,
}: Props) {
  // useFormState wires the server action to this form and returns last result
  const [state, formAction] = useActionState<ActionState, FormData>(action, {
    ok: true,
  });

  const v = {
    id: initialValues?.id ?? "",
    name: initialValues?.name ?? "",
    phone: initialValues?.phone ?? "",
    category: initialValues?.category ?? "FRIEND",
    intervalDays: initialValues?.intervalDays ?? 30,
    isActive: initialValues?.isActive ?? true,
  };

  return (
    <form action={formAction} className="space-y-4">
      {v.id ? <input type="hidden" name="id" defaultValue={v.id} /> : null}

      <div>
        <label className="block text-sm font-medium">Name</label>
        <input
          name="name"
          required
          defaultValue={v.name}
          className="mt-1 w-full rounded-md border px-3 py-2"
          placeholder="Alice Dupont"
        />
        {state?.fieldErrors?.name && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Phone (optional)</label>
        <input
          name="phone"
          type="tel"
          defaultValue={v.phone ?? ""}
          className="mt-1 w-full rounded-md border px-3 py-2"
          placeholder="06 06 06 06 06"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium">Category</label>
          <select
            name="category"
            defaultValue={v.category}
            className="mt-1 w-full rounded-md border px-3 py-2"
          >
            {CategoryEnum.options.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Interval (days)</label>
          <input
            name="intervalDays"
            type="number"
            min={1}
            step={1}
            defaultValue={v.intervalDays}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
          {state?.fieldErrors?.intervalDays && (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.intervalDays}
            </p>
          )}
        </div>
      </div>

      {showActiveToggle && (
        <div className="flex items-center gap-2 pt-2">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            defaultChecked={v.isActive}
            className="h-4 w-4 rounded border"
          />
          <label htmlFor="isActive" className="text-sm">
            Active
          </label>
        </div>
      )}

      {state?.message && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
        >
          {submitLabel}
        </button>
        <a
          href="/contacts"
          className="text-sm text-slate-600 underline hover:text-slate-800"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
