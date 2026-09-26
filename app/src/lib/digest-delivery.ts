/**
 * Digest delivery: decides who gets a digest and when, builds and renders it,
 * sends it through a Mailer, records the send, and previews today's digest
 * for Settings. Takes `now` and the Mailer as inputs so the rules can be
 * tested without a clock or SMTP.
 */
import { digestStatusLabel } from "./contact-card";
import { buildDigest, type DigestData, type DigestItem } from "./digest";
import { isSameUtcDay } from "./due";
import { renderDigestEmail } from "./email";
import type { Mailer } from "./mailer";
import {
  everyUsersSettings,
  getSettings,
  lastDigestSentAt,
  recordDigestSent,
  type AppSettings,
} from "./settings";

/** Where a user's digest goes: their digest email if set, else their account email. */
function recipientFor(settings: AppSettings, accountEmail: string): string {
  return settings.digestEmail || accountEmail;
}

/** Build, render and send one user's digest. */
async function sendDigest(userId: string, to: string, now: Date, mailer: Mailer) {
  const digest = await buildDigest(userId, now);
  const { subject, html } = renderDigestEmail(digest, now);
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

/** How many due Contacts the preview lists before "N more are waiting". */
const PREVIEW_DUE = 5;

export type PreviewItem = { id: string; name: string; label: string };

export type DigestPreview = {
  recipient: string;
  subject: string;
  /** Overdue then due-today Contacts, in due order, capped at five. */
  due: PreviewItem[];
  /** Due Contacts beyond the ones listed. */
  moreDue: number;
  /** The next Contacts coming due, as many as the user's upcoming count. */
  upcoming: PreviewItem[];
  /** The last scheduled digest (test sends don't count), and whether it went out on `now`'s UTC day. */
  lastSent: { at: Date; today: boolean } | null;
};

const toPreviewItem = (i: DigestItem): PreviewItem => ({ id: i.id, name: i.name, label: digestStatusLabel(i) });

/**
 * What today's digest would be for one user at `now` (the "Today's email"
 * preview in Settings). Sends nothing and ignores the digest-enabled flag.
 */
export async function previewDigest(input: {
  userId: string;
  accountEmail: string;
  now: Date;
}): Promise<DigestPreview> {
  const [settings, digest, lastSentAt] = await Promise.all([
    getSettings(input.userId),
    buildDigest(input.userId, input.now),
    lastDigestSentAt(input.userId),
  ]);
  const due = [...digest.overdue, ...digest.today];
  return {
    recipient: recipientFor(settings, input.accountEmail),
    subject: renderDigestEmail(digest, input.now).subject,
    due: due.slice(0, PREVIEW_DUE).map(toPreviewItem),
    moreDue: Math.max(0, due.length - PREVIEW_DUE),
    upcoming: digest.upcoming.map(toPreviewItem),
    lastSent: lastSentAt && { at: lastSentAt, today: isSameUtcDay(lastSentAt, input.now) },
  };
}

export type DigestOutcome = {
  userId: string;
  email: string;
  status: "sent" | "already_sent_today" | "not_time_yet" | "skipped_no_email" | "error";
  messageId?: string;
};

const WINDOW_MINUTES = 30;

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
  const users = await everyUsersSettings();

  const outcomes: DigestOutcome[] = [];
  for (const { userId, accountEmail, settings, lastDigestSentAt: lastSentAt } of users) {
    if (!settings.sendEmailDigest) continue;
    const email = recipientFor(settings, accountEmail);
    if (!email) {
      outcomes.push({ userId, email: "", status: "skipped_no_email" });
      continue;
    }

    if (lastSentAt && isSameUtcDay(lastSentAt, input.now)) {
      outcomes.push({ userId, email, status: "already_sent_today" });
      continue;
    }

    if (!isWithinWindow(settings.digestTime, input.now)) {
      outcomes.push({ userId, email, status: "not_time_yet" });
      continue;
    }

    try {
      const { messageId } = await sendDigest(userId, email, input.now, input.mailer);
      await recordDigestSent(userId, input.now);
      outcomes.push({ userId, email, status: "sent", messageId });
    } catch (err) {
      console.error(`Failed to send digest to ${email}:`, err);
      outcomes.push({ userId, email, status: "error" });
    }
  }
  return outcomes;
}
