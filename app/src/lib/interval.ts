/**
 * The Interval rule and the built-in Category defaults, in one place the
 * server modules and the screens (Settings steppers) all read.
 * Kept free of the database so client components can import it.
 */
import { z } from "zod";
import type { Category } from "@/lib/contact";

/** An Interval is a whole number of days within these limits. */
export const INTERVAL_MIN_DAYS = 1;
export const INTERVAL_MAX_DAYS = 365;

const OUT_OF_RANGE = `Must be between ${INTERVAL_MIN_DAYS} and ${INTERVAL_MAX_DAYS} days`;

export const IntervalDays = z
  .number({ error: "Enter a number of days" })
  .int("Use whole days")
  .min(INTERVAL_MIN_DAYS, OUT_OF_RANGE)
  .max(INTERVAL_MAX_DAYS, OUT_OF_RANGE);

/** Each Category's Interval for a user who hasn't set their own. */
export const DEFAULT_INTERVAL_BY_CATEGORY: Record<Category, number> = {
  FAMILY: 7,
  FRIEND: 30,
  WORK: 14,
  OTHER: 21,
};
