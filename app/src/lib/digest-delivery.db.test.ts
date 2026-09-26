import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { fakeMailer } from "@/test/fake-mailer";
import { previewDigest, runScheduledDigests, sendTestDigest } from "./digest-delivery";
import { getSettings, saveSettings } from "./settings";

const NOW = new Date("2026-03-10T12:00:00Z");

type SettingInput = {
  digestEmail?: string;
  sendEmailDigest?: boolean;
  digestTime?: string;
  lastEmailDigestAt?: Date;
};

async function createUser(email: string, setting?: SettingInput) {
  return prisma.user.create({
    data: { email, setting: setting ? { create: setting } : undefined },
  });
}

describe("sendTestDigest", () => {
  it("sends to the digest email when one is set", async () => {
    const alice = await createUser("alice@example.com", { digestEmail: "alice+digest@example.com" });
    const mailer = fakeMailer();

    const result = await sendTestDigest({ userId: alice.id, accountEmail: alice.email, now: NOW, mailer });

    expect(result.recipient).toBe("alice+digest@example.com");
    expect(mailer.sent.map((m) => m.to)).toEqual([["alice+digest@example.com"]]);
  });

  it("falls back to the account email", async () => {
    const alice = await createUser("alice@example.com");
    const mailer = fakeMailer();

    const result = await sendTestDigest({ userId: alice.id, accountEmail: alice.email, now: NOW, mailer });

    expect(result.recipient).toBe("alice@example.com");
  });

  it("sends even when the digest is disabled, off-schedule and already sent today", async () => {
    const sentThisMorning = new Date("2026-03-10T06:00:00Z");
    const alice = await createUser("alice@example.com", {
      sendEmailDigest: false,
      digestTime: "06:00",
      lastEmailDigestAt: sentThisMorning,
    });
    const mailer = fakeMailer();

    await sendTestDigest({ userId: alice.id, accountEmail: alice.email, now: NOW, mailer });

    expect(mailer.sent).toHaveLength(1);
    const setting = await prisma.setting.findUnique({ where: { userId: alice.id } });
    expect(setting?.lastEmailDigestAt).toEqual(sentThisMorning);
  });

  it("does not count as today's scheduled digest", async () => {
    const alice = await createUser("alice@example.com");

    await sendTestDigest({ userId: alice.id, accountEmail: alice.email, now: NOW, mailer: fakeMailer() });

    expect(await prisma.setting.findUnique({ where: { userId: alice.id } })).toBeNull();
  });

  it("sends the user's rendered digest and returns its stats", async () => {
    const alice = await createUser("alice@example.com");
    await prisma.contact.create({
      data: { userId: alice.id, name: "Mum", intervalDays: 7, lastContactedAt: new Date("2026-03-01T09:00:00Z") },
    });
    const mailer = fakeMailer();

    const result = await sendTestDigest({ userId: alice.id, accountEmail: alice.email, now: NOW, mailer });

    expect(result.stats).toEqual({ overdue: 1, today: 0, upcoming: 0, total: 1 });
    expect(mailer.sent[0].subject).toBe("Keep In Touch — 1 overdue, 0 today");
    expect(mailer.sent[0].html).toContain("Mum");
  });
});

describe("runScheduledDigests", () => {
  const at = (iso: string) => new Date(iso);

  it("sends to a user inside their window and records the send", async () => {
    const alice = await createUser("alice@example.com", { digestTime: "06:00" });
    const now = at("2026-03-10T06:10:00Z");
    const mailer = fakeMailer();

    const outcomes = await runScheduledDigests({ now, mailer });

    expect(outcomes).toEqual([
      { userId: alice.id, email: "alice@example.com", status: "sent", messageId: "fake-1" },
    ]);
    const setting = await prisma.setting.findUnique({ where: { userId: alice.id } });
    expect(setting?.lastEmailDigestAt).toEqual(now);
  });

  it("sends to the digest email the user saved in settings", async () => {
    const alice = await createUser("alice@example.com");
    await saveSettings(alice.id, { ...(await getSettings(alice.id)), digestEmail: "alice+digest@example.com" });
    const mailer = fakeMailer();

    await runScheduledDigests({ now: at("2026-03-10T06:00:00Z"), mailer });

    expect(mailer.sent.map((m) => m.to)).toEqual([["alice+digest@example.com"]]);
  });

  it("reports not_time_yet outside the window and sends nothing", async () => {
    const alice = await createUser("alice@example.com", { digestTime: "06:00" });
    const mailer = fakeMailer();

    const outcomes = await runScheduledDigests({ now: at("2026-03-10T06:31:00Z"), mailer });

    expect(outcomes).toEqual([{ userId: alice.id, email: "alice@example.com", status: "not_time_yet" }]);
    expect(mailer.sent).toEqual([]);
  });

  it("sends across midnight: a 23:50 digest time is due at 00:10 UTC", async () => {
    await createUser("alice@example.com", { digestTime: "23:50" });

    const outcomes = await runScheduledDigests({ now: at("2026-03-10T00:10:00Z"), mailer: fakeMailer() });

    expect(outcomes.map((o) => o.status)).toEqual(["sent"]);
  });

  it("sends at most once per UTC day", async () => {
    await createUser("alice@example.com", {
      digestTime: "06:00",
      lastEmailDigestAt: at("2026-03-10T05:45:00Z"),
    });
    const mailer = fakeMailer();

    const sameDay = await runScheduledDigests({ now: at("2026-03-10T06:15:00Z"), mailer });
    const nextDay = await runScheduledDigests({ now: at("2026-03-11T06:00:00Z"), mailer });

    expect(sameDay.map((o) => o.status)).toEqual(["already_sent_today"]);
    expect(nextDay.map((o) => o.status)).toEqual(["sent"]);
    expect(mailer.sent).toHaveLength(1);
  });

  it("never sends to a user who turned the digest off", async () => {
    await createUser("alice@example.com", { digestTime: "06:00", sendEmailDigest: false });
    const mailer = fakeMailer();

    const outcomes = await runScheduledDigests({ now: at("2026-03-10T06:00:00Z"), mailer });

    expect(outcomes).toEqual([]);
    expect(mailer.sent).toEqual([]);
  });

  it("sends to a user with no settings at the default time and remembers it", async () => {
    const alice = await createUser("alice@example.com");
    const now = at("2026-03-10T06:05:00Z");

    const outcomes = await runScheduledDigests({ now, mailer: fakeMailer() });

    expect(outcomes.map((o) => o.status)).toEqual(["sent"]);
    const setting = await prisma.setting.findUnique({ where: { userId: alice.id } });
    expect(setting?.lastEmailDigestAt).toEqual(now);
  });

  it("sends to the digest email instead of the account email", async () => {
    await createUser("alice@example.com", { digestTime: "06:00", digestEmail: "alice+digest@example.com" });
    const mailer = fakeMailer();

    await runScheduledDigests({ now: at("2026-03-10T06:00:00Z"), mailer });

    expect(mailer.sent.map((m) => m.to)).toEqual([["alice+digest@example.com"]]);
  });

  it("skips a user with no email address at all", async () => {
    const nobody = await createUser("", { digestTime: "06:00" });
    const mailer = fakeMailer();

    const outcomes = await runScheduledDigests({ now: at("2026-03-10T06:00:00Z"), mailer });

    expect(outcomes).toEqual([{ userId: nobody.id, email: "", status: "skipped_no_email" }]);
    expect(mailer.sent).toEqual([]);
  });

  it("keeps going when one user's send fails, and doesn't record the failed send", async () => {
    const alice = await createUser("alice@example.com", { digestTime: "06:00" });
    const bob = await createUser("bob@example.com", { digestTime: "06:00" });
    const mailer = fakeMailer({ failFor: ["alice@example.com"] });

    const outcomes = await runScheduledDigests({ now: at("2026-03-10T06:00:00Z"), mailer });

    expect(outcomes).toContainEqual({ userId: alice.id, email: "alice@example.com", status: "error" });
    expect(outcomes).toContainEqual(
      expect.objectContaining({ userId: bob.id, email: "bob@example.com", status: "sent" })
    );
    const aliceSetting = await prisma.setting.findUnique({ where: { userId: alice.id } });
    expect(aliceSetting?.lastEmailDigestAt).toBeNull();
  });
});

describe("previewDigest", () => {
  const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

  /** A weekly Contact last touched `n` days ago: overdue past 7, due today at 7. */
  async function createContact(userId: string, name: string, lastTouchedDaysAgo: number, isActive = true) {
    return prisma.contact.create({
      data: { userId, name, intervalDays: 7, lastContactedAt: daysAgo(lastTouchedDaysAgo), isActive },
    });
  }

  const listed = (items: { name: string; label: string }[]) => items.map((i) => `${i.name}: ${i.label}`);

  it.each([
    ["a saved digest email", "alice+digest@example.com", "alice+digest@example.com"],
    ["a cleared digest email", null, "alice@example.com"],
    ["a blank digest email", "", "alice@example.com"],
  ])("names the same recipient as the test send, with %s", async (_, digestEmail, expected) => {
    const alice = await createUser("alice@example.com");
    await prisma.setting.create({ data: { userId: alice.id, digestEmail } });
    const mailer = fakeMailer();

    const preview = await previewDigest({ userId: alice.id, accountEmail: alice.email, now: NOW });
    const sent = await sendTestDigest({ userId: alice.id, accountEmail: alice.email, now: NOW, mailer });

    expect(preview.recipient).toBe(expected);
    expect(sent.recipient).toBe(expected);
  });

  it("has the subject of the email a test send delivers", async () => {
    const alice = await createUser("alice@example.com");
    await prisma.contact.create({
      data: { userId: alice.id, name: "Mum", intervalDays: 7, lastContactedAt: new Date("2026-03-01T09:00:00Z") },
    });
    const mailer = fakeMailer();

    const preview = await previewDigest({ userId: alice.id, accountEmail: alice.email, now: NOW });
    await sendTestDigest({ userId: alice.id, accountEmail: alice.email, now: NOW, mailer });

    expect(preview.subject).toBe("Keep In Touch — 1 overdue, 0 today");
    expect(mailer.sent[0].subject).toBe(preview.subject);
  });

  it("lists overdue before due today, in due order, with the email's status wording", async () => {
    const alice = await createUser("alice@example.com");
    await createContact(alice.id, "Dana", 7);
    await createContact(alice.id, "Ben", 8);
    await createContact(alice.id, "Cleo", 10);

    const preview = await previewDigest({ userId: alice.id, accountEmail: alice.email, now: NOW });

    expect(listed(preview.due)).toEqual(["Cleo: 3d overdue", "Ben: 1d overdue", "Dana: Due today"]);
    expect(preview.moreDue).toBe(0);
  });

  it("lists the first five due and counts the rest as waiting", async () => {
    const alice = await createUser("alice@example.com");
    for (const n of [8, 9, 10, 11, 12, 13, 14]) await createContact(alice.id, `Due ${n - 7}d ago`, n);

    const preview = await previewDigest({ userId: alice.id, accountEmail: alice.email, now: NOW });

    expect(preview.due.map((i) => i.name)).toEqual([
      "Due 7d ago", "Due 6d ago", "Due 5d ago", "Due 4d ago", "Due 3d ago",
    ]);
    expect(preview.moreDue).toBe(2);
  });

  it("leaves out Paused Contacts and other users' Contacts", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    await createContact(alice.id, "Alice's friend", 10);
    await createContact(alice.id, "Alice's paused friend", 10, false);
    await createContact(alice.id, "Alice's paused colleague", 2, false);
    await createContact(bob.id, "Bob's friend", 10);
    await createContact(bob.id, "Bob's colleague", 2);

    const preview = await previewDigest({ userId: alice.id, accountEmail: alice.email, now: NOW });

    expect(preview.due.map((i) => i.name)).toEqual(["Alice's friend"]);
    expect(preview.upcoming).toEqual([]);
  });

  it("lists as many upcoming Contacts as the user's upcoming count, soonest first", async () => {
    const alice = await createUser("alice@example.com");
    await prisma.setting.create({ data: { userId: alice.id, upcomingCount: 2 } });
    await createContact(alice.id, "In 4 days", 3);
    await createContact(alice.id, "In 2 days", 5);
    await createContact(alice.id, "In 6 days", 1);

    const preview = await previewDigest({ userId: alice.id, accountEmail: alice.email, now: NOW });

    expect(listed(preview.upcoming)).toEqual(["In 2 days: 2d left", "In 4 days: 4d left"]);
  });

  it("reports no last send before any scheduled digest", async () => {
    const alice = await createUser("alice@example.com");

    const preview = await previewDigest({ userId: alice.id, accountEmail: alice.email, now: NOW });

    expect(preview.lastSent).toBeNull();
  });

  it("reports the scheduled send, and a test send doesn't change it", async () => {
    const alice = await createUser("alice@example.com", { digestTime: "06:00" });
    const scheduledAt = new Date("2026-03-10T06:05:00Z");
    await runScheduledDigests({ now: scheduledAt, mailer: fakeMailer() });

    await sendTestDigest({ userId: alice.id, accountEmail: alice.email, now: NOW, mailer: fakeMailer() });
    const preview = await previewDigest({ userId: alice.id, accountEmail: alice.email, now: NOW });

    expect(preview.lastSent).toEqual({ at: scheduledAt, today: true });
  });

  it("counts a send as today only on its UTC day, like the once-a-day rule", async () => {
    const alice = await createUser("alice@example.com", { digestTime: "00:00" });
    const sentBeforeMidnight = new Date("2026-03-09T23:55:00Z");
    await runScheduledDigests({ now: sentBeforeMidnight, mailer: fakeMailer() });
    const justBefore = new Date("2026-03-09T23:59:00Z");
    const justAfter = new Date("2026-03-10T00:05:00Z");

    const before = await previewDigest({ userId: alice.id, accountEmail: alice.email, now: justBefore });
    const blocked = await runScheduledDigests({ now: justBefore, mailer: fakeMailer() });
    const after = await previewDigest({ userId: alice.id, accountEmail: alice.email, now: justAfter });
    const sent = await runScheduledDigests({ now: justAfter, mailer: fakeMailer() });

    expect(before.lastSent).toEqual({ at: sentBeforeMidnight, today: true });
    expect(blocked.map((o) => o.status)).toEqual(["already_sent_today"]);
    expect(after.lastSent).toEqual({ at: sentBeforeMidnight, today: false });
    expect(sent.map((o) => o.status)).toEqual(["sent"]);
  });
});
