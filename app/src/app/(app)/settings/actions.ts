// src/app/(app)/settings/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-utils";
import { saveSettings, type AppSettings, type SaveSettingsResult } from "@/lib/settings";

/**
 * Save all of a user's settings (Settings saves each change as it's made).
 * Invalid values come back per field, e.g. "digestEmail" or
 * "defaultsByCategory.WORK", and nothing is saved.
 */
export async function saveSettingsAction(values: AppSettings): Promise<SaveSettingsResult> {
  const userId = await requireUser();

  const result = await saveSettings(userId, values);
  if (!result.ok) return result;

  revalidatePath("/");
  revalidatePath("/contacts");
  revalidatePath("/settings");
  return result;
}
