// src/app/api/contacts/[id]/touch/route.ts
// Purpose: update a single contact's lastContactedAt to "now" and
//          return the freshly computed due status.

// This route is SEPARATE from GET /api/contacts. Both files can (and should) co-exist.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // Prisma client (singleton)
import { computeStatus, type ContactLike } from "@/lib/due"; // due logic

// Always run server-side; no caching of the response.
export const dynamic = "force-dynamic";

// Helper: adapt Prisma Contact shape to the minimal ContactLike shape our
// computeStatus() expects.
function toContactLike(c: {
  id: string;
  name: string;
  intervalDays: number;
  createdAt: Date;
  lastContactedAt: Date | null;
}): ContactLike {
  return {
    id: c.id,
    name: c.name,
    intervalDays: c.intervalDays,
    createdAt: c.createdAt,
    lastContactedAt: c.lastContactedAt ?? undefined,
  };
}

// POST /api/contacts/:id/touch
// URL param `id` is taken from the folder name [id].
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const id = params?.id;

  // 1) Validate input early
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Missing id" },
      { status: 400 }
    );
  }

  try {
    // 2) Update the contact: set lastContactedAt to now (UTC).
    // Date-only math (status/days) is handled by due.ts helpers (UTC-safe).
    const updated = await prisma.contact.update({
      where: { id },
      data: { lastContactedAt: new Date() },
    });

    // 3) Compute the new status right away so the client doesn't need to
    // re-fetch the whole list to know the result (still fine to refresh UI).
    const computed = computeStatus(toContactLike(updated), new Date());

    // 4) Return a compact payload (id + computed fields)
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
    // Prisma P2025 = record not found
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
