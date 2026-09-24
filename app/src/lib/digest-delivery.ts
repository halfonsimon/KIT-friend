/**
 * Digest delivery: decides who gets a digest and when, builds and renders it,
 * sends it through a Mailer, and records the send. Takes `now` and the Mailer
 * as inputs so the rules can be tested without a clock or SMTP.
 */
import { prisma } from "./db";
import { buildDigest, type DigestData } from "./digest";
import { renderDigestEmail } from "./email";
import type { Mailer } from "./mailer";
import { getSettings, settingsFromRow, type AppSettings } from "./settings";

/** Where a user's digest goes: their digest email if set, else their account email. */
function recipientFor(settings: AppSettings, accountEmail: string): string {
  return settings.digestEmail || accountEmail;
}

/** Build, render and send one user's digest. */
async function sendDigest(userId: string, to: string, now: Date, mailer: Mailer) {
  const digest = await buildDigest(userId, now);
  const { subject, html } = renderDigestEmail(digest);
  const sent = await mailer.send({ to: [to], subject, html });
  return { messageId: sent.messageId, stats: digest.stats };
}

export type TestDigestResult = {
  recipient: string;
  messageId: string;
  stats: DigestData["stats"];
};

/**
 * Send one user's digest right away (the "Send test email" button).
 * Ignores the send window, the once-a-day check and the digest-enabled flag,
 * and does not count as today's scheduled digest.
 */
export async function sendTestDigest(input: {
  userId: string;
  accountEmail: string;
  now: Date;
  mailer: Mailer;
}): Promise<TestDigestResult> {
  const settings = await getSettings(input.userId);
  const recipient = recipientFor(settings, input.accountEmail);
  const { messageId, stats } = await sendDigest(input.userId, recipient, input.now, input.mailer);

  return { recipient, messageId, stats };
}

export type DigestOutcome = {
  userId: string;
  email: string;
  status: "sent" | "already_sent_today" | "not_time_yet" | "skipped_no_email" | "error";
  messageId?: string;
};

const WINDOW_MINUTES = 30;

const utcDay = (d: Date) => d.toISOString().slice(0, 10);

/** Is `now` within ±30 minutes of the user's HH:MM digest time (UTC)? */
function isWithinWindow(digestTime: string, now: Date): boolean {
  const [hour, minute] = digestTime.split(":").map(Number);
  const target = hour * 60 + minute;
  const current = now.getUTCHours() * 60 + now.getUTCMinutes();
  const diff = Math.abs(current - target);
  return diff <= WINDOW_MINUTES || diff >= 24 * 60 - WINDOW_MINUTES;
}

/**
 * The cron-triggered run: send today's digest to every user whose digest
 * time is now, and report what happened for each user.
 */
export async function runScheduledDigests(input: {
  now: Date;
  mailer: Mailer;
}): Promise<DigestOutcome[]> {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, setting: true },
  });

  const outcomes: DigestOutcome[] = [];
  for (const user of users) {
    const settings = settingsFromRow(user.setting);
    if (!settings.sendEmailDigest) continue;
    const email = recipientFor(settings, user.email);
    if (!email) {
      outcomes.push({ userId: user.id, email: "", status: "skipped_no_email" });
      continue;
    }

    const lastSent = user.setting?.lastEmailDigestAt;
    if (lastSent && utcDay(lastSent) === utcDay(input.now)) {
      outcomes.push({ userId: user.id, email, status: "already_sent_today" });
      continue;
    }

    if (!isWithinWindow(settings.digestTime, input.now)) {
      outcomes.push({ userId: user.id, email, status: "not_time_yet" });
      continue;
    }

    try {
      const { messageId } = await sendDigest(user.id, email, input.now, input.mailer);

      await prisma.setting.upsert({
        where: { userId: user.id },
        create: { userId: user.id, lastEmailDigestAt: input.now },
        update: { lastEmailDigestAt: input.now },
      });
      outcomes.push({ userId: user.id, email, status: "sent", messageId });
    } catch (err) {
      console.error(`Failed to send digest to ${email}:`, err);
      outcomes.push({ userId: user.id, email, status: "error" });
    }
  }
  return outcomes;
}
