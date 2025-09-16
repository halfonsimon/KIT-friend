// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

// Avoid creating many PrismaClient instances in dev (HMR)
declare global {
  /// eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// Re-export useful types if needed elsewhere
export type { Prisma, Contact } from "@prisma/client";
