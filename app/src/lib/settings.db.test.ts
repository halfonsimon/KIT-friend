import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { everyUsersSettings, getSettings, recordDigestSent, saveSettings, type AppSettings } from "./settings";

async function createUser(email: string) {
  return prisma.user.create({ data: { email } });
}

const CUSTOM: AppSettings = {
  upcomingCount: 5,
  defaultsByCategory: { FAMILY: 3, FRIEND: 20, WORK: 10, OTHER: 60 },
  sendEmailDigest: false,
  digestTime: "07:30",
  digestEmail: "alice+digest@example.com",
  dailyGoal: 5,
};

describe("settings", () => {
  it("reads back exactly what was saved", async () => {
    const alice = await createUser("alice@example.com");

    await saveSettings(alice.id, CUSTOM);

    expect(await getSettings(alice.id)).toEqual(CUSTOM);
  });

  it("clears the digest email", async () => {
    const alice = await createUser("alice@example.com");
    await saveSettings(alice.id, CUSTOM);

    await saveSettings(alice.id, { ...CUSTOM, digestEmail: null });

    expect((await getSettings(alice.id)).digestEmail).toBeNull();
  });

  it.each([
    ["blank", ""],
    ["whitespace-only", "   "],
  ])("saves a %s digest email as none", async (_, digestEmail) => {
    const alice = await createUser("alice@example.com");
    await saveSettings(alice.id, CUSTOM);

    expect(await saveSettings(alice.id, { ...CUSTOM, digestEmail })).toEqual({ ok: true });

    expect((await getSettings(alice.id)).digestEmail).toBeNull();
  });

  it("saves a padded digest email trimmed", async () => {
    const alice = await createUser("alice@example.com");

    await saveSettings(alice.id, { ...CUSTOM, digestEmail: "  alice+digest@example.com  " });

    expect((await getSettings(alice.id)).digestEmail).toBe("alice+digest@example.com");
  });

  it.each([
    ["an upcoming count above 50", { upcomingCount: 51 }, "upcomingCount", "Must be between 0 and 50"],
    ["a negative upcoming count", { upcomingCount: -1 }, "upcomingCount", "Must be between 0 and 50"],
    ["a zero-day interval", { defaultsByCategory: { ...CUSTOM.defaultsByCategory, WORK: 0 } }, "defaultsByCategory.WORK", "Must be between 1 and 365 days"],
    ["an interval over a year", { defaultsByCategory: { ...CUSTOM.defaultsByCategory, FAMILY: 366 } }, "defaultsByCategory.FAMILY", "Must be between 1 and 365 days"],
    ["a fractional interval", { defaultsByCategory: { ...CUSTOM.defaultsByCategory, FRIEND: 2.5 } }, "defaultsByCategory.FRIEND", "Use whole days"],
    ["a missing interval", { defaultsByCategory: { ...CUSTOM.defaultsByCategory, OTHER: NaN } }, "defaultsByCategory.OTHER", "Enter a number of days"],
    ["a digest time that isn't HH:MM", { digestTime: "25:00" }, "digestTime", "Invalid time format (HH:MM)"],
    ["an invalid digest email", { digestEmail: " not-an-email " }, "digestEmail", "Enter a valid email address, or leave it blank"],
    ["a daily goal of zero", { dailyGoal: 0 }, "dailyGoal", "Must be between 1 and 20"],
    ["a daily goal above 20", { dailyGoal: 21 }, "dailyGoal", "Must be between 1 and 20"],
  ])("rejects %s and saves nothing", async (_, change, field, message) => {
    const alice = await createUser("alice@example.com");

    const result = await saveSettings(alice.id, { ...CUSTOM, ...change });

    expect(result).toEqual({ ok: false, fieldErrors: { [field]: message } });
    expect(await getSettings(alice.id)).toEqual(await getSettings("no-such-user"));
  });

  it("names every invalid field with one readable message each", async () => {
    const alice = await createUser("alice@example.com");

    const result = await saveSettings(alice.id, {
      ...CUSTOM,
      defaultsByCategory: { ...CUSTOM.defaultsByCategory, WORK: 0.5 },
      digestEmail: "not-an-email",
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        "defaultsByCategory.WORK": "Use whole days",
        digestEmail: "Enter a valid email address, or leave it blank",
      },
    });
  });

  it("gives a user with no saved settings the defaults", async () => {
    const alice = await createUser("alice@example.com");

    expect(await getSettings(alice.id)).toEqual({
      upcomingCount: 2,
      defaultsByCategory: { FAMILY: 7, FRIEND: 30, WORK: 14, OTHER: 21 },
      sendEmailDigest: true,
      digestTime: "06:00",
      digestEmail: null,
      dailyGoal: 3,
    });
  });

  it("records when the last digest was sent, even before any settings were saved", async () => {
    const alice = await createUser("alice@example.com");
    const sentAt = new Date("2026-03-10T06:00:00Z");

    await recordDigestSent(alice.id, sentAt);

    expect(await everyUsersSettings()).toEqual([
      { userId: alice.id, accountEmail: "alice@example.com", settings: await getSettings(alice.id), lastDigestSentAt: sentAt },
    ]);
  });

  it("keeps the last digest time when settings are saved", async () => {
    const alice = await createUser("alice@example.com");
    const sentAt = new Date("2026-03-10T06:00:00Z");
    await recordDigestSent(alice.id, sentAt);

    await saveSettings(alice.id, CUSTOM);

    const [row] = await everyUsersSettings();
    expect(row).toMatchObject({ settings: CUSTOM, lastDigestSentAt: sentAt });
  });
});
