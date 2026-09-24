// Direct access to the end-to-end database, for arranging state the UI can't
// (e.g. a Contact created days ago) and for checking what a request saved.
import { PrismaClient } from "@prisma/client";
import { e2eDatabaseUrl } from "./env";

export const db = new PrismaClient({ datasourceUrl: e2eDatabaseUrl() });

const DAY_MS = 24 * 60 * 60 * 1000;

export const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

/** Current UTC time as HH:MM, so a user's digest time falls inside the send window. */
export function utcTimeNow(): string {
  return new Date().toISOString().slice(11, 16);
}
