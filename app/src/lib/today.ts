/**
 * Today: the signed-in home. The overdue and due-today Contacts (Paused ones
 * left out), split into the few Today suggests starting with (up to the
 * user's Daily goal, less anyone already Touched today) and everyone else.
 */
import { isSameUtcDay } from "./due";
import { roster, type RosterContact } from "./roster";
import { getSettings } from "./settings";

export type TodayView = {
  dailyGoal: number;
  /** Active Contacts Touched on `now`'s UTC day. */
  doneToday: number;
  /** Who to start with, in due order. Empty once the Daily goal is met. */
  suggested: RosterContact[];
  /** The rest of the due Contacts, in due order. */
  others: RosterContact[];
  /** Whether the user has any active Contacts at all. */
  hasContacts: boolean;
};

export async function today(userId: string, now: Date): Promise<TodayView> {
  const [{ dailyGoal }, people] = await Promise.all([
    getSettings(userId),
    roster(userId, now, { activeOnly: true }),
  ]);

  const due = people.filter((p) => p.status !== "ok");
  const doneToday = people.filter((p) => p.lastContactedAt && isSameUtcDay(p.lastContactedAt, now)).length;
  const stillToSuggest = Math.max(0, dailyGoal - doneToday);

  return {
    dailyGoal,
    doneToday,
    suggested: due.slice(0, stillToSuggest),
    others: due.slice(stillToSuggest),
    hasContacts: people.length > 0,
  };
}
