// src/lib/validation.ts
// Reusable Zod schemas for contact forms (create/edit)

import { z } from "zod";
import { CATEGORY_VALUES } from "@/lib/contact";

// Mirror our Prisma enums
export const CategoryEnum = z.enum(CATEGORY_VALUES);

// Coercions:
// - intervalDays: accept string input (from <input type="number">) and coerce to number
// - isActive: accept checkbox/string ("on", "true") and coerce to boolean
// - phone: empty string becomes undefined, and validate if provided
export const ContactFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z
    .string()
    .trim()
    .transform((s) => (s === "" ? undefined : s))
    .optional(),
  category: CategoryEnum,
  intervalDays: z
    .union([
      z
        .string()
        .trim()
        .transform((s) => (s === "" ? undefined : parseInt(s) || undefined)),
      z.number(),
      z.undefined(),
    ])
    .optional()
    .refine(
      (val) => val === undefined || (typeof val === "number" && val >= 1),
      {
        message: "Interval must be ≥ 1",
      }
    ),
  isActive: z.boolean(),
});

export type ContactFormInput = z.infer<typeof ContactFormSchema>;
