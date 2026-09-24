// src/app/contacts/actions.ts
// Server Actions for create/update contact. They validate input with Zod,
// write through the per-user Contact module, then refresh/redirect the list page.

"use server";

import { ContactFormSchema, type ContactFormInput } from "@/lib/validation";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-utils";
import { contactsOf } from "@/lib/contacts-of";

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

// Map a validated form to contact fields; a blank interval means "category default"
function toContactFields(input: ContactFormInput) {
  return {
    name: input.name,
    phone: input.phone ?? null,
    category: input.category,
    intervalDays: input.intervalDays ?? null,
    isActive: input.isActive,
  };
}

// Turn a thrown error into form state: field errors for invalid input, else a generic message
function toErrorState(err: unknown, action: string): ActionState {
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      fieldErrors[issue.path.map(String).join(".") || "form"] = issue.message;
    }
    return { ok: false, fieldErrors };
  }
  console.error(`${action} error:`, err);
  return { ok: false, message: "Server error. Please try again." };
}

export async function createContact(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const userId = await requireUser();
    const input = readForm(formData);

    await contactsOf(userId).create(toContactFields(input));
    // Ensure /contacts shows fresh data, then navigate
    revalidatePath("/contacts");
    redirect("/contacts");
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return toErrorState(err, "createContact");
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

    const updated = await contactsOf(userId).update(id, toContactFields(input));
    if (!updated) return { ok: false, message: "Contact not found" };

    revalidatePath("/contacts");
    redirect("/contacts");
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return toErrorState(err, "updateContact");
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

    const removed = await contactsOf(userId).remove(id);
    if (!removed) return { ok: false, message: "Contact not found" };

    revalidatePath("/contacts");
    redirect("/contacts");
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return toErrorState(err, "deleteContact");
  }
}
