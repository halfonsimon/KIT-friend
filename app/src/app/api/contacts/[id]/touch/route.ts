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
import { computeStatus } from "@/lib/due";
import { processInteractionNote } from "@/lib/ai";
import {
  buildContactContext,
  stringifyStoredStringArray,
  toContactLike,
} from "@/lib/contact";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const params = await ctx.params;
  const id = params?.id;

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Missing id" },
      { status: 400 }
    );
  }

  try {
    // Parse optional note from request body
    let note = "";
    try {
      const body = await req.json();
      note = typeof body?.note === "string" ? body.note.trim() : "";
    } catch {
      // No body or invalid JSON is fine - note is optional
    }

    // Update lastContactedAt
    const updated = await prisma.contact.update({
      where: { id },
      data: { lastContactedAt: new Date() },
      include: {
        interactions: {
          orderBy: { notedAt: "desc" },
          take: 10,
        },
      },
    });

    // Create interaction record if there's a note
    if (note) {
      await prisma.interaction.create({
        data: {
          contactId: id,
          note,
          notedAt: new Date(),
        },
      });

      // Process with AI using Next.js after() for background work
      // This keeps the serverless function alive until AI processing completes
      if (process.env.GEMINI_API_KEY) {
        after(async () => {
          await processNoteWithAI(id, note, updated);
        });
      } else {
        console.log("Skipping AI processing - GEMINI_API_KEY not configured");
      }
    }

    // Compute new status
    const computed = computeStatus(toContactLike(updated), new Date());

    return NextResponse.json({
      ok: true,
      data: {
        id: updated.id,
        lastContactedAt: updated.lastContactedAt,
        status: computed.status,
        daysUntilDue: computed.daysUntilDue,
        nextDueAt: computed.nextDueAt.toISOString(),
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

/**
 * Process note with AI and update contact.
 */
async function processNoteWithAI(
  contactId: string,
  note: string,
  contact: {
    name: string;
    category: string;
    aiSummary: string | null;
    keyTopics: string | null;
    followUps: string | null;
    interactions: { note: string | null; notedAt: Date }[];
  }
) {
  try {
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
