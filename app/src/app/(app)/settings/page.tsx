// Settings: daily goal, the daily email (with a preview of today's), check-in defaults, account.
import SettingsScreen, { type EmailPreview } from "@/components/settings/SettingsScreen";
import { getAccount } from "@/lib/account";
import { requireUser } from "@/lib/auth-utils";
import { previewDigest, type DigestPreview } from "@/lib/digest-delivery";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function lastSentLabel(lastSent: DigestPreview["lastSent"]) {
  if (!lastSent) return "No daily email sent yet.";
  const { at, today } = lastSent;
  const time = at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  const day = today ? "today" : `on ${at.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })}`;
  return `Last sent ${day} at ${time} UTC`;
}

export default async function SettingsPage() {
  const userId = await requireUser();
  const [settings, account] = await Promise.all([getSettings(userId), getAccount(userId)]);
  const digest = await previewDigest({ userId, accountEmail: account.email, now: new Date() });

  const firstName = account.name?.trim().split(/\s+/)[0];
  const preview: EmailPreview = {
    recipient: digest.recipient,
    subject: digest.subject,
    greeting: firstName ? `Good morning, ${firstName}.` : "Good morning.",
    due: digest.due,
    moreDue: digest.moreDue,
    upcoming: digest.upcoming,
    lastSent: lastSentLabel(digest.lastSent),
  };

  const provider = account.provider === "google" ? "signed in with Google" : "signed in with email";

  return (
    <SettingsScreen
      initial={settings}
      account={{ name: account.name, email: account.email, provider }}
      preview={preview}
    />
  );
}
