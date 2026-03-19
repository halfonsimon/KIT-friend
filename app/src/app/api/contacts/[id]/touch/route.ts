/**
 * POST /api/contacts/:id/touch
 * 
 * Mark a contact as contacted today, optionally with a note.
 * If a note is provided, triggers AI processing to update the contact's
 * relationship summary, key topics, and follow-ups.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeStatus, type ContactLike } from "@/lib/due";
import { processInteractionNote, type ContactContext } from "@/lib/ai";

export const dynamic = "force-dynamic";

function toContactLike(c: {
  id: string;
  name: string;
  phone: string | null;
  intervalDays: number;
  createdAt: Date;
  lastContactedAt: Date | null;
}): ContactLike {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    intervalDays: c.intervalDays,
    createdAt: c.createdAt,
    lastContactedAt: c.lastContactedAt ?? undefined,
  };
}

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

      // Process with AI (async, don't block response)
      processNoteInBackground(id, note, updated);
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
 * Process note with AI in background (non-blocking).
 * Updates contact's aiSummary, keyTopics, and followUps.
 */
async function processNoteInBackground(
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
    // Skip AI processing if no API key configured
    if (!process.env.OPENAI_API_KEY) {
      console.log("Skipping AI processing - OPENAI_API_KEY not configured");
      return;
    }

    const context: ContactContext = {
      name: contact.name,
      category: contact.category as "FAMILY" | "FRIEND" | "WORK" | "OTHER",
      existingSummary: contact.aiSummary,
      existingTopics: contact.keyTopics
        ? JSON.parse(contact.keyTopics)
        : [],
      existingFollowUps: contact.followUps
        ? JSON.parse(contact.followUps)
        : [],
      recentInteractions: contact.interactions
        .filter((i) => i.note)
        .map((i) => ({
          note: i.note!,
          date: i.notedAt,
        })),
    };

    const processed = await processInteractionNote(note, context);

    await prisma.contact.update({
      where: { id: contactId },
      data: {
        aiSummary: processed.summary,
        keyTopics: JSON.stringify(processed.keyTopics),
        followUps: JSON.stringify(processed.followUps),
      },
    });

    console.log(`AI processed note for contact ${contactId}`);
  } catch (error) {
    console.error("Background AI processing error:", error);
  }
}
