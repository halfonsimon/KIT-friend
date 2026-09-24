/**
 * Per-user Contact module: the only way to read or change a single contact.
 * Every method is scoped to one user. A contact that doesn't exist and a
 * contact owned by someone else both come back as `null`, so callers can't
 * tell them apart and can't reach another user's row.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export type ContactChanges = Omit<Prisma.ContactUpdateInput, "user" | "interactions">;

export function contactsOf(userId: string) {
  // Ownership check: load by id AND userId; "not found" means "not owned".
  const owned = (id: string) => prisma.contact.findFirst({ where: { id, userId } });

  return {
    get: owned,

    async update(id: string, changes: ContactChanges) {
      if (!(await owned(id))) return null;
      return prisma.contact.update({ where: { id }, data: changes });
    },

    async remove(id: string) {
      if (!(await owned(id))) return null;
      return prisma.contact.delete({ where: { id } });
    },
  };
}
