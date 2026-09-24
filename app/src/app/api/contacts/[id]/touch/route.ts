/**
 * POST /api/contacts/:id/touch
 * 
 * Mark a contact as contacted today, optionally with a note.
 * If a note is provided, triggers AI processing to update the contact's
 * relationship summary, key topics, and follow-ups.
 */

import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { recordTouch } from "@/lib/touch";
import { processInteractionNote } from "@/lib/ai";
import {
  buildContactContext,
  stringifyStoredStringArray,
} from "@/lib/contact";
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

    const result = await recordTouch({ userId, contactId: id, note, now: new Date() });
    if (!result) {
      return NextResponse.json({ ok: false, error: "Contact not found" }, { status: 404 });
    }

    if (note) {
      if (process.env.GEMINI_API_KEY) {
        after(async () => {
          await processNoteWithAI(id, note);
        });
      } else {
        console.log("Skipping AI processing - GEMINI_API_KEY not configured");
      }
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

async function processNoteWithAI(contactId: string, note: string) {
  try {
    const contact = await prisma.contact.findUniqueOrThrow({
      where: { id: contactId },
      include: { interactions: { orderBy: { notedAt: "desc" }, skip: 1, take: 10 } },
    });
    console.log(`Processing AI for contact ${contactId}...`);
    
    const processed = await processInteractionNote(
      note,
      buildContactContext(contact)
    );

    await prisma.contact.update({
      where: { id: contactId },
      data: {
        aiSummary: processed.summary,
        keyTopics: stringifyStoredStringArray(processed.keyTopics),
        followUps: stringifyStoredStringArray(processed.followUps),
      },
    });

    console.log(`AI processed note for contact ${contactId}: ${processed.summary?.slice(0, 50)}...`);
  } catch (error) {
    console.error("AI processing error:", error);
  }
}
