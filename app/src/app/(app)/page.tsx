import { auth } from "@/auth";
import { requireUser } from "@/lib/auth-utils";
import { today } from "@/lib/today";
import TodayScreen from "@/components/today/TodayScreen";
import { toTodayPerson } from "@/components/today/types";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const userId = await requireUser();
  const now = new Date();
  const [session, view] = await Promise.all([auth(), today(userId, now)]);

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
