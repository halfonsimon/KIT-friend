// In-memory Mailer adapter for tests: records what it was asked to send.
import type { Mail, Mailer } from "@/lib/mailer";

export function fakeMailer(options: { failFor?: string[] } = {}) {
  const sent: Mail[] = [];
  const mailer: Mailer = {
    async send(mail) {
      if (mail.to.some((to) => options.failFor?.includes(to))) {
        throw new Error(`Fake mailer rejected ${mail.to.join(", ")}`);
      }
      sent.push(mail);
      return { messageId: `fake-${sent.length}`, accepted: mail.to, rejected: [] };
    },
  };
  return { ...mailer, sent };
}
