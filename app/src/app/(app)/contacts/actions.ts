// src/app/contacts/actions.ts
// Server Actions for create/update/delete contact. They pass the submitted form
// to the per-user Contact module, which owns the input rules, then refresh/redirect.

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-utils";
import { contactsOf } from "@/lib/contacts-of";
import type { FieldErrors } from "@/lib/field-errors";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
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

// Turn an unexpected error into a generic form message
function toErrorState(err: unknown, action: string): ActionState {
  console.error(`${action} error:`, err);
  return { ok: false, message: "Server error. Please try again." };
}

export async function createContact(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const userId = await requireUser();

    const result = await contactsOf(userId).createFromForm(formData);
    if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };

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

    const result = await contactsOf(userId).updateFromForm(id, formData);
    if (!result) return { ok: false, message: "Contact not found" };
    if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };

    revalidatePath("/contacts");
    revalidatePath(`/contacts/${id}`);
    redirect(`/contacts/${id}`);
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
