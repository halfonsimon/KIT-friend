/**
 * POST /api/contacts/:id/touch
 * 
 * Mark a contact as contacted today, optionally with a note.
 * If a note is provided, triggers AI processing to update the contact's
 * relationship summary, key topics, and follow-ups.
 *
 * DELETE /api/contacts/:id/touch
 *
 * Undo a touch: body `{ undo }`, the Undo value from the POST response.
 * 404 when it's unknown or not the user's, 409 once the contact has been
 * touched again since.
 */

import { NextResponse, after } from "next/server";
import { recordTouch, undoTouch } from "@/lib/touch";
import { geminiMemory } from "@/lib/ai";
import { getOptionalUserId } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getOptionalUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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

export async function DELETE(req: Request) {
  const userId = await getOptionalUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const undo = body?.undo;
  if (typeof undo !== "string" || !undo) {
    return NextResponse.json({ ok: false, error: "undo is required" }, { status: 400 });
  }

  try {
    const result = await undoTouch({ userId, undo });
    if (result === "not_found") {
      return NextResponse.json({ ok: false, error: "Touch not found" }, { status: 404 });
    }
    if (result === "touched_again") {
      return NextResponse.json({ ok: false, error: "Touched again since" }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/contacts/[id]/touch error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
