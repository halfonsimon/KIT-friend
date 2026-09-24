// src/app/(app)/settings/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-utils";
import { getSettings, saveSettings } from "@/lib/settings";

const toNumber = (v: FormDataEntryValue | null) => Number(v ?? NaN);

export async function updateSettings(formData: FormData) {
  const userId = await requireUser();
  const current = await getSettings(userId);

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
    // The settings form has no digest email field yet; keep the saved value.
    digestEmail: current.digestEmail,
  });

  revalidatePath("/digest");
  revalidatePath("/settings");
  redirect("/settings");
}
