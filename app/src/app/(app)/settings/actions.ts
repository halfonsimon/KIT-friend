// src/app/(app)/settings/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-utils";
import { ZodError } from "zod";
import { saveSettings, type AppSettings } from "@/lib/settings";

export type SaveSettingsResult = { ok: true } | { ok: false; fieldErrors: Record<string, string> };

/**
 * Save all of a user's settings (Settings saves each change as it's made).
 * Invalid values come back per field, e.g. "digestEmail" or
 * "defaultsByCategory.WORK", and nothing is saved.
 */
export async function saveSettingsAction(values: AppSettings): Promise<SaveSettingsResult> {
  const userId = await requireUser();

  try {
    await saveSettings(userId, {
      ...values,
      digestEmail: values.digestEmail?.trim() || null,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of err.issues) {
        const field = issue.path.map(String).join(".") || "form";
        fieldErrors[field] ??= issue.message;
      }
      return { ok: false, fieldErrors };
    }
    throw err;
  }

  revalidatePath("/");
  revalidatePath("/contacts");
  revalidatePath("/settings");
  return { ok: true };
}
