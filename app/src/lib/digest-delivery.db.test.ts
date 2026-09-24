import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { fakeMailer } from "@/test/fake-mailer";
import { runScheduledDigests, sendTestDigest } from "./digest-delivery";
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
