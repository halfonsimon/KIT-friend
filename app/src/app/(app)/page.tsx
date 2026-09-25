import { auth } from "@/auth";
import { today } from "@/lib/today";
import Landing from "@/components/landing/Landing";
import TodayScreen from "@/components/today/TodayScreen";
import { toTodayPerson } from "@/components/today/types";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  // Signed out, "/" is the landing page; signed in, it's Today.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return <Landing />;

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
