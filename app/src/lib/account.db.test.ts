import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getAccount } from "./account";

describe("getAccount", () => {
  it("reads the name and email stored on the user's account", async () => {
    const alice = await prisma.user.create({ data: { email: "alice@example.com", name: "Alice Smith" } });

    expect(await getAccount(alice.id)).toEqual({ name: "Alice Smith", email: "alice@example.com", provider: "email" });
  });

  it("says the user signed in with Google when a Google account is linked", async () => {
    const alice = await prisma.user.create({
      data: {
        email: "alice@example.com",
        accounts: { create: { type: "oauth", provider: "google", providerAccountId: "g-1" } },
      },
    });

    expect(await getAccount(alice.id)).toEqual({ name: null, email: "alice@example.com", provider: "google" });
  });

  it("returns null when the user no longer exists", async () => {
    expect(await getAccount("deleted-user")).toBeNull();
  });
});
