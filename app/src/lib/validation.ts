// src/lib/validation.ts
// Reusable Zod schemas for contact forms (create/edit)

import { z } from "zod";

// Mirror our Prisma enums
export const CategoryEnum = z.enum(["FAMILY", "FRIEND", "WORK", "OTHER"]);

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
  intervalDays: z.coerce.number().int().min(1, "Interval must be ≥ 1"),
  isActive: z.coerce.boolean().default(true),
});

export type ContactFormInput = z.infer<typeof ContactFormSchema>;
