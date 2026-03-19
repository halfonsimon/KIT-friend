/**
 * GET /api/contacts/:id/briefing
 * 
 * Generate an AI-powered briefing for a contact before reaching out.
 * Returns personalized context, follow-ups, and conversation openers.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateBriefing, type ContactContext } from "@/lib/ai";
import { computeStatus, type ContactLike } from "@/lib/due";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
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
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        interactions: {
          orderBy: { notedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!contact) {
      return NextResponse.json(
        { ok: false, error: "Contact not found" },
        { status: 404 }
      );
    }

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        ok: true,
        data: {
          briefing: null,
          summary: contact.aiSummary,
          keyTopics: contact.keyTopics ? JSON.parse(contact.keyTopics) : [],
          followUps: contact.followUps ? JSON.parse(contact.followUps) : [],
          message: "AI briefing not available - OPENAI_API_KEY not configured",
        },
      });
    }

    // Calculate days since contact
    const contactLike: ContactLike = {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      intervalDays: contact.intervalDays,
      createdAt: contact.createdAt,
      lastContactedAt: contact.lastContactedAt ?? undefined,
    };
    const status = computeStatus(contactLike, new Date());
    const daysSinceContact = contact.lastContactedAt
      ? Math.floor(
          (Date.now() - contact.lastContactedAt.getTime()) / (1000 * 60 * 60 * 24)
        )
      : Math.floor(
          (Date.now() - contact.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

    const context: ContactContext = {
      name: contact.name,
      category: contact.category as "FAMILY" | "FRIEND" | "WORK" | "OTHER",
      existingSummary: contact.aiSummary,
      existingTopics: contact.keyTopics ? JSON.parse(contact.keyTopics) : [],
      existingFollowUps: contact.followUps ? JSON.parse(contact.followUps) : [],
      recentInteractions: contact.interactions
        .filter((i) => i.note)
        .map((i) => ({
          note: i.note!,
          date: i.notedAt,
        })),
    };

    const briefing = await generateBriefing(context, daysSinceContact);

    return NextResponse.json({
      ok: true,
      data: {
        briefing,
        summary: contact.aiSummary,
        keyTopics: contact.keyTopics ? JSON.parse(contact.keyTopics) : [],
        followUps: contact.followUps ? JSON.parse(contact.followUps) : [],
        daysSinceContact,
        status: status.status,
      },
    });
  } catch (err) {
    console.error("GET /api/contacts/[id]/briefing error", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
