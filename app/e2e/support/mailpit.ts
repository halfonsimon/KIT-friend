// Read the email Mailpit caught, through its HTTP API.
import { expect } from "@playwright/test";
import { MAILPIT_URL } from "./env";

type Summary = { ID: string; Subject: string; To: { Address: string }[] };

export type CaughtMail = { subject: string; to: string[]; html: string };

export async function clearMailpit() {
  const res = await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Could not clear Mailpit at ${MAILPIT_URL} (${res.status}). Is it running?`);
}

/** Every message Mailpit caught for this address, oldest first. */
export async function mailTo(address: string): Promise<CaughtMail[]> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=200`);
  const { messages } = (await res.json()) as { messages: Summary[] };
  const mine = messages
    .filter((m) => m.To.some((t) => t.Address.toLowerCase() === address.toLowerCase()))
    .reverse();

  return Promise.all(
    mine.map(async (m) => {
      const full = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${m.ID}`)).json()) as {
        HTML: string;
      };
      return { subject: m.Subject, to: m.To.map((t) => t.Address), html: full.HTML };
    })
  );
}

/** Wait until exactly `count` messages have arrived for this address, and return them. */
export async function expectMailTo(address: string, count: number): Promise<CaughtMail[]> {
  let mail: CaughtMail[] = [];
  await expect
    .poll(async () => (mail = await mailTo(address)).length, {
      message: `expected ${count} email(s) to ${address}`,
      timeout: 10_000,
    })
    .toBe(count);
  return mail;
}
