/**
 * POST /api/contacts/:id/touch
 * 
 * Mark a contact as contacted today, optionally with a note.
 * If a note is provided, triggers AI processing to update the contact's
 * relationship summary, key topics, and follow-ups.
 *
 * DELETE /api/contacts/:id/touch
 *
 * Undo a touch: body `{ touchedAt, restoreTo }` from the POST response
 * (`lastContactedAt`, `previousContactedAt`).
 */

import { NextResponse, after } from "next/server";
import { recordTouch, undoTouch } from "@/lib/touch";
import { geminiMemory } from "@/lib/ai";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const params = await ctx.params;
  const id = params?.id;

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Missing id" },
      { status: 400 }
    );
  }

  try {
    let note = "";
    try {
      const body = await req.json();
      note = typeof body?.note === "string" ? body.note : "";
    } catch {
      // No body or invalid JSON is fine - note is optional
    }

    const result = await recordTouch({
      userId,
      contactId: id,
      note,
      now: new Date(),
      memory: geminiMemory(),
      defer: after,
    });
    if (!result) {
      return NextResponse.json({ ok: false, error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: result.id,
        lastContactedAt: result.lastContactedAt,
        previousContactedAt: result.previousContactedAt,
        undo: result.undo,
        status: result.status,
        daysUntilDue: result.daysUntilDue,
        nextDueAt: result.nextDueAt.toISOString(),
      },
    });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2025"
    ) {
      return NextResponse.json(
        { ok: false, error: "Contact not found" },
        { status: 404 }
      );
    }
    console.error("POST /api/contacts/[id]/touch error", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}

function parseDate(value: unknown): Date | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const touchedAt = parseDate(body?.touchedAt);
  const restoreTo = parseDate(body?.restoreTo);
  if (!touchedAt || restoreTo === undefined) {
    return NextResponse.json({ ok: false, error: "touchedAt and restoreTo are required" }, { status: 400 });
  }

  try {
    const undone = await undoTouch({ userId: session.user.id, contactId: id, touchedAt, restoreTo });
    if (undone === null) {
      return NextResponse.json({ ok: false, error: "Contact not found" }, { status: 404 });
    }
    if (!undone) {
      return NextResponse.json({ ok: false, error: "Touched again since" }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/contacts/[id]/touch error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
