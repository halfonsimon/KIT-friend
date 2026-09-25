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
    ["an upcoming count above 50", { upcomingCount: 51 }],
    ["a negative upcoming count", { upcomingCount: -1 }],
    ["a zero-day interval", { defaultsByCategory: { ...CUSTOM.defaultsByCategory, WORK: 0 } }],
    ["an interval over a year", { defaultsByCategory: { ...CUSTOM.defaultsByCategory, FAMILY: 366 } }],
    ["a digest time that isn't HH:MM", { digestTime: "25:00" }],
    ["an invalid digest email", { digestEmail: "not-an-email" }],
    ["a daily goal of zero", { dailyGoal: 0 }],
    ["a daily goal above 20", { dailyGoal: 21 }],
  ])("rejects %s and saves nothing", async (_, change) => {
    const alice = await createUser("alice@example.com");

    await expect(saveSettings(alice.id, { ...CUSTOM, ...change })).rejects.toThrow();

    expect((await getSettings(alice.id)).upcomingCount).toBe(2);
  });

  it("names every invalid field with a readable message", async () => {
    const alice = await createUser("alice@example.com");

    const error = await saveSettings(alice.id, {
      ...CUSTOM,
      defaultsByCategory: { ...CUSTOM.defaultsByCategory, WORK: 0 },
      digestEmail: "not-an-email",
    }).catch((e) => e);

    expect(error.issues.map((i: { path: string[]; message: string }) => [i.path.join("."), i.message])).toEqual([
      ["defaultsByCategory.WORK", "Must be between 1 and 365 days"],
      ["digestEmail", "Enter a valid email address, or leave it blank"],
    ]);
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
