/**
 * Application settings management.
 * Each user has their own settings row, keyed by userId.
 * Falls back to sensible defaults if no settings exist.
 */
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Category } from "@/lib/contact";
import { fieldErrorsFrom, type FieldErrors } from "@/lib/field-errors";
import { DEFAULT_INTERVAL_BY_CATEGORY, IntervalDays } from "@/lib/interval";

const FALLBACK = {
  upcomingCount: 2,
  defaultsByCategory: DEFAULT_INTERVAL_BY_CATEGORY,
  sendEmailDigest: true,
  digestTime: "06:00",
  digestEmail: null as string | null,
  // How many due people Today suggests starting with.
  dailyGoal: 3,
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
  dailyGoal: number | null;
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
    dailyGoal: Math.max(1, row.dailyGoal ?? FALLBACK.dailyGoal),
  };
}

export async function getSettings(userId: string): Promise<AppSettings> {
  const row = await prisma.setting.findUnique({ where: { userId } });
  return settingsFromRow(row);
}

/** The limits every saved setting must respect. */
export const SettingsSchema = z.object({
  upcomingCount: z
    .number({ error: "Enter a number" })
    .int("Use a whole number")
    .min(0, "Must be between 0 and 50")
    .max(50, "Must be between 0 and 50"),
  defaultsByCategory: z.object({
    FAMILY: IntervalDays,
    FRIEND: IntervalDays,
    WORK: IntervalDays,
    OTHER: IntervalDays,
  }),
  sendEmailDigest: z.boolean(),
  digestTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  digestEmail: z.email("Enter a valid email address, or leave it blank").nullable(),
  dailyGoal: z
    .number({ error: "Enter a number" })
    .int("Use a whole number")
    .min(1, "Must be between 1 and 20")
    .max(20, "Must be between 1 and 20"),
});

export type SaveSettingsResult = { ok: true } | { ok: false; fieldErrors: FieldErrors };

/**
 * Validate and save a user's settings. The digest email is trimmed, and blank
 * means none. Values outside the limits come back as field errors and nothing
 * is saved. Never touches when the last digest was sent.
 */
export async function saveSettings(userId: string, settings: AppSettings): Promise<SaveSettingsResult> {
  const parsed = SettingsSchema.safeParse({ ...settings, digestEmail: settings.digestEmail?.trim() || null });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  const s = parsed.data;
  const columns = {
    upcomingCount: s.upcomingCount,
    defaultFamilyDays: s.defaultsByCategory.FAMILY,
    defaultFriendDays: s.defaultsByCategory.FRIEND,
    defaultWorkDays: s.defaultsByCategory.WORK,
    defaultOtherDays: s.defaultsByCategory.OTHER,
    sendEmailDigest: s.sendEmailDigest,
    digestTime: s.digestTime,
    digestEmail: s.digestEmail,
    dailyGoal: s.dailyGoal,
  };
  await prisma.setting.upsert({
    where: { userId },
    create: { userId, ...columns },
    update: columns,
  });
  return { ok: true };
}

/** Record that a user's scheduled digest was sent at `at`. */
export async function recordDigestSent(userId: string, at: Date): Promise<void> {
  await prisma.setting.upsert({
    where: { userId },
    create: { userId, lastEmailDigestAt: at },
    update: { lastEmailDigestAt: at },
  });
}

/** When a user's last scheduled digest was sent, or null if none has been. */
export async function lastDigestSentAt(userId: string): Promise<Date | null> {
  const row = await prisma.setting.findUnique({
    where: { userId },
    select: { lastEmailDigestAt: true },
  });
  return row?.lastEmailDigestAt ?? null;
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
