import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

describe("test database", () => {
  it("stores and reads back a user", async () => {
    await prisma.user.create({ data: { email: "smoke@example.com" } });

    const user = await prisma.user.findUnique({ where: { email: "smoke@example.com" } });

    expect(user?.email).toBe("smoke@example.com");
  });

  it("starts each test from an empty database", async () => {
    expect(await prisma.user.count()).toBe(0);
  });
});
