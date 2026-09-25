// Settings: daily goal, the daily email (with a preview of today's), check-in defaults, account.
import { auth } from "@/auth";
import SettingsScreen, { type EmailPreview } from "@/components/settings/SettingsScreen";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { buildDigest } from "@/lib/digest";
import { statusLabel } from "@/lib/due";
import { renderDigestEmail } from "@/lib/email";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** How many due people the preview lists before "N more are waiting". */
const PREVIEW_DUE = 5;

function lastSentLabel(at: Date | null | undefined, now: Date) {
  if (!at) return "No daily email sent yet.";
  const time = at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  const sameDay = at.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
  const day = sameDay ? "today" : `on ${at.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })}`;
  return `Last sent ${day} at ${time} UTC`;
}

export default async function SettingsPage() {
  const userId = await requireUser();
  const now = new Date();
  const [session, settings, digest, user] = await Promise.all([
    auth(),
    getSettings(userId),
    buildDigest(userId, now),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true, accounts: { select: { provider: true } }, setting: { select: { lastEmailDigestAt: true } } },
    }),
  ]);

  const email = user.email ?? session?.user?.email ?? "";
  const firstName = user.name?.trim().split(/\s+/)[0];
  const due = [...digest.overdue, ...digest.today];
  const toItem = (i: (typeof due)[number]) => ({ id: i.id, name: i.name, label: statusLabel(i) });

  const preview: EmailPreview = {
    recipient: settings.digestEmail ?? email,
    subject: renderDigestEmail(digest).subject,
    greeting: firstName ? `Good morning, ${firstName}.` : "Good morning.",
    due: due.slice(0, PREVIEW_DUE).map(toItem),
    moreDue: Math.max(0, due.length - PREVIEW_DUE),
    upcoming: digest.upcoming.map(toItem),
    lastSent: lastSentLabel(user.setting?.lastEmailDigestAt, now),
  };

  const provider = user.accounts.some((a) => a.provider === "google") ? "signed in with Google" : "signed in with email";

  return (
    <SettingsScreen
      initial={settings}
      account={{ name: user.name, email, provider }}
      preview={preview}
    />
  );
}
