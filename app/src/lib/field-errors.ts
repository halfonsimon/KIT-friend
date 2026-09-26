import type { z } from "zod";

/** Invalid input, as one message per field path (e.g. "defaultsByCategory.WORK"). */
export type FieldErrors = Record<string, string>;

/** Turn validation issues into field errors. When a field has several problems, the first wins. */
export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    fieldErrors[issue.path.map(String).join(".") || "form"] ??= issue.message;
  }
  return fieldErrors;
}
