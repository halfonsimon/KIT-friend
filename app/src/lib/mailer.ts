/**
 * SMTP email transport for sending digest emails.
 * Uses nodemailer with configuration from environment variables.
 */
import nodemailer from "nodemailer";

type SMTPConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

/**
 * Read SMTP configuration from environment variables.
 * Throws if any required variable is missing.
 */
function readSMTP(): SMTPConfig {
  const host = process.env.SMTP_HOST || "";
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.FROM_EMAIL || "";

  if (!host || !port || !user || !pass || !from) {
    throw new Error(
      "SMTP env vars missing (SMTP_HOST/PORT/USER/PASS and FROM_EMAIL)."
    );
  }
  return { host, port, user, pass, from };
}

export type Mail = { to: string[]; subject: string; html: string };

export type SentMail = { messageId: string; accepted: string[]; rejected: string[] };

/** Anything that can deliver an HTML email: SMTP in production, a fake in tests. */
export type Mailer = { send(mail: Mail): Promise<SentMail> };

const addressOf = (a: string | { address: string }) =>
  typeof a === "string" ? a : a.address;

/**
 * Mailer backed by SMTP. Reads its configuration on every send and
 * throws if any SMTP env var is missing.
 */
export function smtpMailer(): Mailer {
  return {
    async send({ to, subject, html }) {
      const cfg = readSMTP();

      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.port === 465, // 465 = SSL, 587 = STARTTLS
        auth: { user: cfg.user, pass: cfg.pass },
      });

      const info = await transporter.sendMail({
        from: cfg.from,
        to: to.join(", "),
        subject,
        html,
      });

      return {
        messageId: info.messageId,
        accepted: info.accepted.map(addressOf),
        rejected: info.rejected.map(addressOf),
      };
    },
  };
}
