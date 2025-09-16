// src/app/contacts/actions.ts
// Server Actions for create/update contact. They validate input with Zod,
// write via Prisma and then refresh/redirect the list page.

"use server";

import { prisma } from "../../lib/db";
import { ContactFormSchema, type ContactFormInput } from "../../lib/validation";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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
  const email = String(fd.get("email") ?? "");
  const category = String(fd.get("category") ?? "");

  // intervalDays comes from an <input type="number"> as a string.
  // Pass the string to Zod so z.coerce.number() can convert it and report nice errors.
  const intervalEntry = fd.get("intervalDays");
  const intervalDays = typeof intervalEntry === "string" ? intervalEntry : "";

  const notifyChannel = String(fd.get("notifyChannel") ?? "");

  // Active checkbox may be absent on the create page. If absent, leave undefined
  // so Zod's default(true) applies. If present, it's a string like "on".
  const activeEntry = fd.get("isActive");
  const isActive = typeof activeEntry === "string" ? activeEntry : undefined;

  const data = { name, email, category, intervalDays, notifyChannel, isActive };
  return ContactFormSchema.parse(data);
}

export async function createContact(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const input = readForm(formData);
    await prisma.contact.create({
      data: {
        name: input.name,
        email: input.email ?? null,
        category: input.category,
        intervalDays: input.intervalDays,
        notifyChannel: input.notifyChannel,
        isActive: input.isActive,
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
    const id = String(formData.get("id") ?? "");
    if (!id) return { ok: false, message: "Missing id" };

    const input = readForm(formData);
    await prisma.contact.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email ?? null,
        category: input.category,
        intervalDays: input.intervalDays,
        notifyChannel: input.notifyChannel,
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
