"use client";

// Client wrapper for the settings form: submits through the server action
// without resetting the form, so on a validation error the user keeps what
// they typed and each field shows its own message.

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { updateSettings } from "./actions";

type FieldErrors = Record<string, string>;

const ErrorsContext = createContext<FieldErrors>({});

export function SettingsForm({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [, startTransition] = useTransition();

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await updateSettings(formData);
          setErrors(result?.fieldErrors ?? {});
        });
      }}
    >
      <ErrorsContext.Provider value={errors}>{children}</ErrorsContext.Provider>
    </form>
  );
}

/** The validation message for one settings field, if it has one. */
export function FieldError({ field }: { field: string }) {
  const message = useContext(ErrorsContext)[field];
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-red-600">
      {message}
    </p>
  );
}
