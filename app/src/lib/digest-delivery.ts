/**
 * Digest delivery: decides who gets a digest and when, builds and renders it,
 * sends it through a Mailer, and records the send. Takes `now` and the Mailer
 * as inputs so the rules can be tested without a clock or SMTP.
 */
import { buildDigest, type DigestData } from "./digest";
import { renderDigestEmail } from "./email";
import type { Mailer } from "./mailer";
import { getSettings } from "./settings";

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
  const recipient = settings.digestEmail || input.accountEmail;

  const digest = await buildDigest(input.userId, input.now);
  const { subject, html } = renderDigestEmail(digest);
  const sent = await input.mailer.send({ to: [recipient], subject, html });

  return { recipient, messageId: sent.messageId, stats: digest.stats };
}
