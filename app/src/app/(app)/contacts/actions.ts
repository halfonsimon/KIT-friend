// src/app/contacts/actions.ts
// Server Actions for create/update contact. They validate input with Zod,
// write via Prisma and then refresh/redirect the list page.

"use server";

import { prisma } from "@/lib/db";
import { getSettings, defaultIntervalFor } from "@/lib/settings";
import { ContactFormSchema, type ContactFormInput } from "@/lib/validation";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-utils";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

// Detect Next.js redirect errors thrown by redirect()/notFound()
function isNextRedirect(err: unknown): boolean {
  try {
    return (
      typeof err === "object" &&
      err !== null &&
      "digest" in err &&
      String((err as { digest: string }).digest).includes("NEXT_REDIRECT")
    );
  } catch {
    return false;
  }
}

// Helper: extract and validate form fields using Zod
function readForm(fd: FormData): ContactFormInput {
  // Extract raw values from FormData without using `any`.
  const name = String(fd.get("name") ?? "");
  const phone = String(fd.get("phone") ?? "");
  const category = String(fd.get("category") ?? "");

  // intervalDays comes from an <input type="number"> as a string.
  // Pass the string to Zod so z.coerce.number() can convert it and report nice errors.
  const intervalEntry = fd.get("intervalDays");
  const intervalDays = typeof intervalEntry === "string" ? intervalEntry : "";

  // Active checkbox: if present it's "on", if absent it means false (unchecked)
  const activeEntry = fd.get("isActive");
  const isActive = activeEntry === "on";

  const data = { name, phone, category, intervalDays, isActive };
  return ContactFormSchema.parse(data);
}

export async function createContact(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const userId = await requireUser();
    const input = readForm(formData);

    const settings = await getSettings(userId);
    const intervalDays = input.intervalDays ?? defaultIntervalFor(input.category, settings);

    await prisma.contact.create({
      data: {
        name: input.name,
        phone: input.phone ?? null,
        category: input.category,
        intervalDays,
        isActive: input.isActive,
        userId,
      },
    });
    // Ensure /contacts shows fresh data, then navigate
    revalidatePath("/contacts");
    redirect("/contacts");
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (
      err &&
      typeof err === "object" &&
      "name" in err &&
      err.name === "ZodError"
    ) {
      const fieldErrors: Record<string, string> = {};
      const issues =
        err && typeof err === "object" && "issues" in err
          ? (err.issues as { path: string[]; message: string }[])
          : [];
      for (const issue of issues) {
        const k = issue.path?.join?.(".") || "form";
        fieldErrors[k] = issue.message;
      }
      return { ok: false, fieldErrors };
    }
    console.error("createContact error:", err);
    return { ok: false, message: "Server error. Please try again." };
  }
}

export async function updateContact(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const userId = await requireUser();
    const id = String(formData.get("id") ?? "");
    if (!id) return { ok: false, message: "Missing id" };

    const input = readForm(formData);

    const settings = await getSettings(userId);
    const intervalDays = input.intervalDays ?? defaultIntervalFor(input.category, settings);

    await prisma.contact.update({
      where: { id, userId },
      data: {
        name: input.name,
        phone: input.phone ?? null,
        category: input.category,
        intervalDays,
        isActive: input.isActive,
      },
    });
    revalidatePath("/contacts");
    redirect("/contacts");
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (
      err &&
      typeof err === "object" &&
      "name" in err &&
      err.name === "ZodError"
    ) {
      const fieldErrors: Record<string, string> = {};
      const issues =
        err && typeof err === "object" && "issues" in err
          ? (err.issues as { path: string[]; message: string }[])
          : [];
      for (const issue of issues) {
        const k = issue.path?.join?.(".") || "form";
        fieldErrors[k] = issue.message;
      }
      return { ok: false, fieldErrors };
    }
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2025"
    ) {
      return { ok: false, message: "Contact not found" };
    }
    console.error("updateContact error:", err);
    return { ok: false, message: "Server error. Please try again." };
  }
}

export async function deleteContact(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const userId = await requireUser();
    const id = String(formData.get("id") ?? "");
    if (!id) return { ok: false, message: "Missing id" };

    await prisma.contact.delete({
      where: { id, userId },
    });
    revalidatePath("/contacts");
    redirect("/contacts");
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2025"
    ) {
      return { ok: false, message: "Contact not found" };
    }
    console.error("deleteContact error:", err);
    return { ok: false, message: "Server error. Please try again." };
  }
}
