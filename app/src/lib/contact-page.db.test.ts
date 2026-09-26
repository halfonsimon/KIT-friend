import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { saveSettings, getSettings } from "@/lib/settings";
import { contactPage } from "./contact-page";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function createUser(email: string) {
  return prisma.user.create({ data: { email } });
}

describe("contactPage", () => {
  it("loads the Contact, the user's Settings and the notes, newest first", async () => {
    const alice = await createUser("alice@example.com");
    const noa = await prisma.contact.create({
      data: {
        userId: alice.id,
        name: "Noa",
        intervalDays: 3,
        interactions: {
          create: [
            { note: "Older", notedAt: daysAgo(20) },
            { note: "Newer", notedAt: daysAgo(2) },
          ],
        },
      },
    });
    const settings = { ...(await getSettings(alice.id)), dailyGoal: 5 };
    await saveSettings(alice.id, settings);

    const page = await contactPage(alice.id, noa.id, new Date());

    expect(page?.contact.name).toBe("Noa");
    expect(page?.settings.dailyGoal).toBe(5);
    expect(page?.contact.interactions.map((i) => i.note)).toEqual(["Newer", "Older"]);
  });

  it("falls back to default Settings when the user has none saved", async () => {
    const alice = await createUser("alice@example.com");
    const noa = await prisma.contact.create({ data: { userId: alice.id, name: "Noa", intervalDays: 3 } });

    const page = await contactPage(alice.id, noa.id, new Date());

    expect(page?.settings).toEqual(await getSettings(alice.id));
    expect(page?.contact.interactions).toEqual([]);
  });

  it("returns null for another user's Contact, and never their Interactions", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    const bobsFriend = await prisma.contact.create({
      data: { userId: bob.id, name: "Bob's friend", intervalDays: 7, interactions: { create: [{ note: "Private" }] } },
    });

    expect(await contactPage(alice.id, bobsFriend.id, new Date())).toBeNull();
  });

  it("returns null for a Contact that doesn't exist", async () => {
    const alice = await createUser("alice@example.com");

    expect(await contactPage(alice.id, "missing", new Date())).toBeNull();
  });
});
