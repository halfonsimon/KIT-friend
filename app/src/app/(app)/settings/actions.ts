// src/app/(app)/settings/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-utils";
import { ZodError } from "zod";
import { saveSettings } from "@/lib/settings";

const toNumber = (v: FormDataEntryValue | null) => Number(v ?? NaN);

export async function updateSettings(formData: FormData) {
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
    // Send the user back with the invalid field named, so the page can show its error.
    if (err instanceof ZodError) {
      const field = String(err.issues[0]?.path[0] ?? "form");
      redirect(`/settings?invalid=${encodeURIComponent(field)}`);
    }
    throw err;
  }

  revalidatePath("/digest");
  revalidatePath("/settings");
  redirect("/settings");
}
