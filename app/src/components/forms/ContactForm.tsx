"use client";

import { useActionState, useState } from "react";
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
  categoryDefaults?: {
    FAMILY: number;
    FRIEND: number;
    WORK: number;
    OTHER: number;
  };
};

export default function ContactForm({
  action,
  initialValues,
  submitLabel,
  showActiveToggle,
  categoryDefaults,
}: Props) {
  // useFormState wires the server action to this form and returns last result
  const [state, formAction] = useActionState<ActionState, FormData>(action, {
    ok: true,
  });

  // Track selected category for dynamic placeholder
  const [selectedCategory, setSelectedCategory] = useState<
    "FAMILY" | "FRIEND" | "WORK" | "OTHER"
  >(initialValues?.category ?? "FRIEND");

  const v = {
    id: initialValues?.id ?? "",
    name: initialValues?.name ?? "",
    phone: initialValues?.phone ?? "",
    category: initialValues?.category ?? "FRIEND",
    intervalDays: initialValues?.intervalDays, // Can be undefined for dynamic defaults
    isActive: initialValues?.isActive ?? true,
  };

  // Get placeholder based on selected category
  const getIntervalPlaceholder = () => {
    if (categoryDefaults) {
      return `Default: ${categoryDefaults[selectedCategory]} days`;
    }
    return "30";
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-6">
        <form action={formAction} className="space-y-6">
          {v.id ? <input type="hidden" name="id" defaultValue={v.id} /> : null}

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Name *
            </label>
            <input
              name="name"
              required
              defaultValue={v.name}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
              placeholder="Enter full name"
            />
            {state?.fieldErrors?.name && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {state.fieldErrors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Phone
            </label>
            <input
              name="phone"
              type="tel"
              defaultValue={v.phone ?? ""}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
              placeholder="+972 5......."
            />
            <p className="mt-1 text-xs text-slate-500">
              Optional contact number
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Category
              </label>
              <select
                name="category"
                defaultValue={v.category}
                onChange={(e) =>
                  setSelectedCategory(
                    e.target.value as "FAMILY" | "FRIEND" | "WORK" | "OTHER"
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
              >
                {CategoryEnum.options.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Interval (days)
              </label>
              <input
                name="intervalDays"
                type="number"
                min={1}
                step={1}
                defaultValue={v.intervalDays ?? ""}
                placeholder={getIntervalPlaceholder()}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
              />
              {state?.fieldErrors?.intervalDays && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {state.fieldErrors.intervalDays}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                How often to be reminded (leave empty for category default)
              </p>
            </div>
          </div>

          {showActiveToggle && (
            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                defaultChecked={v.isActive}
                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-2 mt-0.5"
              />
              <div className="flex-1">
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium text-slate-900"
                >
                  Include in digest
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  When checked, this contact will appear in your daily digest
                  emails
                </p>
              </div>
            </div>
          )}

          {state?.message && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {state.message}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <a
              href="/contacts"
              className="text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors"
            >
              ← Back to contacts
            </a>
            <button
              type="submit"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-[1.02]"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
