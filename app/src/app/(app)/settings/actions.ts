// src/app/(app)/settings/actions.ts
"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const Schema = z.object({
  upcomingCount: z.coerce.number().int().min(0).max(50),
  family: z.coerce.number().int().min(1).max(365),
  friend: z.coerce.number().int().min(1).max(365),
  work: z.coerce.number().int().min(1).max(365),
  other: z.coerce.number().int().min(1).max(365),
  sendEmailDigest: z.boolean().optional(),
  sendWhatsappDigest: z.boolean().optional(),
});

export async function updateSettings(formData: FormData) {
  const data = Schema.parse({
    upcomingCount: formData.get("upcomingCount"),
    family: formData.get("family"),
    friend: formData.get("friend"),
    work: formData.get("work"),
    other: formData.get("other"),
    // checkboxes -> 'on' ou null
    sendEmailDigest: formData.get("sendEmailDigest") === "on",
    sendWhatsappDigest: formData.get("sendWhatsappDigest") === "on",
  });

  await prisma.setting.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      upcomingCount: data.upcomingCount,
      defaultFamilyDays: data.family,
      defaultFriendDays: data.friend,
      defaultWorkDays: data.work,
      defaultOtherDays: data.other,
      sendEmailDigest: data.sendEmailDigest ?? true,
      sendWhatsappDigest: data.sendWhatsappDigest ?? false,
    },
    update: {
      upcomingCount: data.upcomingCount,
      defaultFamilyDays: data.family,
      defaultFriendDays: data.friend,
      defaultWorkDays: data.work,
      defaultOtherDays: data.other,
      sendEmailDigest: data.sendEmailDigest ?? true,
      sendWhatsappDigest: data.sendWhatsappDigest ?? false,
    },
  });

  revalidatePath("/digest");
  revalidatePath("/settings");
  redirect("/settings");
}
