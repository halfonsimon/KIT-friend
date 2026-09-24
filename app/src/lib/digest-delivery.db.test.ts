import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { fakeMailer } from "@/test/fake-mailer";
import { sendTestDigest } from "./digest-delivery";

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
