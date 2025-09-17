import nodemailer from "nodemailer";

type SMTPConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

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
