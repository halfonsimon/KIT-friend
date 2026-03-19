/**
 * Prisma client singleton.
 * In development, we store the client on globalThis to prevent
 * creating multiple instances during Hot Module Replacement (HMR).
 * In production, a single instance is created and reused.
 */
import { PrismaClient } from "@prisma/client";

declare global {
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
