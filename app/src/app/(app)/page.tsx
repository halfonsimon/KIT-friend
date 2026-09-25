import { auth } from "@/auth";
import { today } from "@/lib/today";
import TodayScreen from "@/components/today/TodayScreen";
import { toTodayPerson } from "@/components/today/types";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  // Signed out, the layout shows the landing page instead of this.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const now = new Date();
  const view = await today(userId, now);

  const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? null;
  const dateLabel = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  return (
    <TodayScreen
      firstName={firstName}
      dateLabel={dateLabel}
      dailyGoal={view.dailyGoal}
      doneToday={view.doneToday}
      suggested={view.suggested.map((c) => toTodayPerson(c, now))}
      others={view.others.map((c) => toTodayPerson(c, now))}
      hasContacts={view.hasContacts}
    />
  );
}
