/**
 * Application settings management.
 * Each user has their own settings row, keyed by userId.
 * Falls back to sensible defaults if no settings exist.
 */
import { prisma } from "@/lib/db";
import type { Category } from "@/lib/contact";

const FALLBACK = {
  upcomingCount: 2,
  defaultsByCategory: {
    FAMILY: 7,
    FRIEND: 30,
    WORK: 14,
    OTHER: 21,
  } as Record<Category, number>,
  sendEmailDigest: true,
  digestTime: "06:00",
  digestEmail: null as string | null,
};

export type AppSettings = typeof FALLBACK;

export async function getSettings(userId: string): Promise<AppSettings> {
  const row = await prisma.setting.findUnique({ where: { userId } });
  if (!row) return FALLBACK;
  return {
    upcomingCount: Math.max(0, row.upcomingCount ?? FALLBACK.upcomingCount),
    defaultsByCategory: {
      FAMILY: Math.max(
        1,
        row.defaultFamilyDays ?? FALLBACK.defaultsByCategory.FAMILY
      ),
      FRIEND: Math.max(
        1,
        row.defaultFriendDays ?? FALLBACK.defaultsByCategory.FRIEND
      ),
      WORK: Math.max(
        1,
        row.defaultWorkDays ?? FALLBACK.defaultsByCategory.WORK
      ),
      OTHER: Math.max(
        1,
        row.defaultOtherDays ?? FALLBACK.defaultsByCategory.OTHER
      ),
    },
    sendEmailDigest: !!row.sendEmailDigest,
    digestTime: row.digestTime ?? FALLBACK.digestTime,
    digestEmail: row.digestEmail ?? null,
  };
}

export function defaultIntervalFor(
  category: Category,
  s: AppSettings = FALLBACK
) {
  return s.defaultsByCategory[category] ?? FALLBACK.defaultsByCategory.OTHER;
}
