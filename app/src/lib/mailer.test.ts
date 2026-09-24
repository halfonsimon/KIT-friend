import { describe, it, expect, vi, beforeEach } from "vitest";

// 1) Mock nodemailer
vi.mock("nodemailer", () => {
  return {
    default: {
      createTransport: vi.fn(() => ({
        sendMail: vi.fn(async () => ({
          messageId: "test-id",
          accepted: ["to@example.com"],
          rejected: [],
        })),
      })),
    },
  };
});

import nodemailer from "nodemailer";
import { smtpMailer } from "./mailer";

const OLD_ENV = process.env;

describe("smtpMailer", () => {
  beforeEach(() => {
    process.env = { ...OLD_ENV };
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASS = "secret";
    process.env.FROM_EMAIL = "KIT <no-reply@example.com>";
  });

  it("creates a transport and sends with correct fields", async () => {
    const res = await smtpMailer().send({
      to: ["alice@example.com", "bob@example.com"],
      subject: "Daily digest",
      html: "<p>Hello</p>",
    });

    expect(res.messageId).toBe("test-id");

    // Vérifier l'appel du transport
    const create = vi.mocked(nodemailer.createTransport);
    expect(create).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      auth: { user: "user@example.com", pass: "secret" },
    });

    const transporter = create.mock.results[0].value;
    expect(transporter.sendMail).toHaveBeenCalledWith({
      from: "KIT <no-reply@example.com>",
      to: "alice@example.com, bob@example.com",
      subject: "Daily digest",
      html: "<p>Hello</p>",
    });
  });

  it("throws if SMTP env is missing", async () => {
    delete process.env.SMTP_PASS;
    await expect(
      smtpMailer().send({ to: ["a@ex.com"], subject: "S", html: "<p>x</p>" })
    ).rejects.toThrow(
      /SMTP env vars missing/i
    );
  });
});
