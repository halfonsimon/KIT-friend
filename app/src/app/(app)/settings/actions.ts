// src/app/(app)/settings/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-utils";
import { ZodError } from "zod";
import { saveSettings } from "@/lib/settings";

const toNumber = (v: FormDataEntryValue | null) => Number(v ?? NaN);

export type SettingsActionState = { fieldErrors: Record<string, string> } | undefined;

export async function updateSettings(formData: FormData): Promise<SettingsActionState> {
  const userId = await requireUser();
  const digestEmail = String(formData.get("digestEmail") ?? "").trim();

  try {
    await saveSettings(userId, {
      upcomingCount: toNumber(formData.get("upcomingCount")),
      defaultsByCategory: {
        FAMILY: toNumber(formData.get("family")),
        FRIEND: toNumber(formData.get("friend")),
        WORK: toNumber(formData.get("work")),
        OTHER: toNumber(formData.get("other")),
      },
      sendEmailDigest: formData.get("sendEmailDigest") === "on",
      digestTime: String(formData.get("digestTime") ?? ""),
      digestEmail: digestEmail || null,
    });
  } catch (err) {
    // Report each invalid field (e.g. "digestEmail", "defaultsByCategory.WORK") to the form.
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of err.issues) {
        const field = issue.path.map(String).join(".") || "form";
        fieldErrors[field] ??= issue.message;
      }
      return { fieldErrors };
    }
    throw err;
  }

  revalidatePath("/digest");
  revalidatePath("/settings");
  redirect("/settings");
}
