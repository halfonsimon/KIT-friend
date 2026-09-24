/**
 * Application settings management.
 * Each user has their own settings row, keyed by userId.
 * Falls back to sensible defaults if no settings exist.
 */
import { z } from "zod";
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

type SettingRow = {
  upcomingCount: number | null;
  defaultFamilyDays: number | null;
  defaultFriendDays: number | null;
  defaultWorkDays: number | null;
  defaultOtherDays: number | null;
  sendEmailDigest: boolean | null;
  digestTime: string | null;
  digestEmail: string | null;
};

/** Apply defaults and clamping to a Setting row that may not exist yet. */
function settingsFromRow(row: SettingRow | null): AppSettings {
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
    sendEmailDigest: row.sendEmailDigest ?? FALLBACK.sendEmailDigest,
    digestTime: row.digestTime ?? FALLBACK.digestTime,
    digestEmail: row.digestEmail ?? null,
  };
}

export async function getSettings(userId: string): Promise<AppSettings> {
  const row = await prisma.setting.findUnique({ where: { userId } });
  return settingsFromRow(row);
}

const IntervalDays = z.number().int().min(1).max(365);

/** The limits every saved setting must respect. */
export const SettingsSchema = z.object({
  upcomingCount: z.number().int().min(0).max(50),
  defaultsByCategory: z.object({
    FAMILY: IntervalDays,
    FRIEND: IntervalDays,
    WORK: IntervalDays,
    OTHER: IntervalDays,
  }),
  sendEmailDigest: z.boolean(),
  digestTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  digestEmail: z.email("Invalid email address").nullable(),
});

/**
 * Validate and save a user's settings. Throws a ZodError for values outside
 * the limits. Never touches when the last digest was sent.
 */
export async function saveSettings(userId: string, settings: AppSettings): Promise<void> {
  const s = SettingsSchema.parse(settings);
  const columns = {
    upcomingCount: s.upcomingCount,
    defaultFamilyDays: s.defaultsByCategory.FAMILY,
    defaultFriendDays: s.defaultsByCategory.FRIEND,
    defaultWorkDays: s.defaultsByCategory.WORK,
    defaultOtherDays: s.defaultsByCategory.OTHER,
    sendEmailDigest: s.sendEmailDigest,
    digestTime: s.digestTime,
    digestEmail: s.digestEmail,
  };
  await prisma.setting.upsert({
    where: { userId },
    create: { userId, ...columns },
    update: columns,
  });
}

/** Record that a user's scheduled digest was sent at `at`. */
export async function recordDigestSent(userId: string, at: Date): Promise<void> {
  await prisma.setting.upsert({
    where: { userId },
    create: { userId, lastEmailDigestAt: at },
    update: { lastEmailDigestAt: at },
  });
}

export type UserSettings = {
  userId: string;
  accountEmail: string;
  settings: AppSettings;
  lastDigestSentAt: Date | null;
};

/** Every user's settings (with defaults applied) and when their last digest was sent. */
export async function everyUsersSettings(): Promise<UserSettings[]> {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, setting: true },
  });
  return users.map((u) => ({
    userId: u.id,
    accountEmail: u.email,
    settings: settingsFromRow(u.setting),
    lastDigestSentAt: u.setting?.lastEmailDigestAt ?? null,
  }));
}

export function defaultIntervalFor(
  category: Category,
  s: AppSettings = FALLBACK
) {
  return s.defaultsByCategory[category] ?? FALLBACK.defaultsByCategory.OTHER;
}
