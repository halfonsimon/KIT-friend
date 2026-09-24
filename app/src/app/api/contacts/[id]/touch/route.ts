/**
 * POST /api/contacts/:id/touch
 * 
 * Mark a contact as contacted today, optionally with a note.
 * If a note is provided, triggers AI processing to update the contact's
 * relationship summary, key topics, and follow-ups.
 */

import { NextResponse, after } from "next/server";
import { recordTouch } from "@/lib/touch";
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
      note = typeof body?.note === "string" ? body.note.trim() : "";
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
