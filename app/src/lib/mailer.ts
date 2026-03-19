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

/**
 * Send the daily digest email via SMTP.
 * @param to - Array of recipient email addresses
 * @param subject - Email subject line
 * @param html - HTML content of the email
 * @returns Object with messageId, accepted, and rejected addresses
 */
export async function sendDigestSMTP(
  to: string[],
  subject: string,
  html: string
) {
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
    accepted: info.accepted,
    rejected: info.rejected,
  };
}
