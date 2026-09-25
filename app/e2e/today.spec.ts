// Today, the signed-in home: who to start with, recording a Touch from the List
// and from One at a time, and reaching the Daily goal.
import { expect, test, type Page } from "@playwright/test";
import { db, daysAgo } from "./support/db";
import { newUser, registerThroughUi } from "./support/users";

/** Register a user whose weekly Contacts were last Touched 30, 20, 10 and 9 days ago. */
async function userWithOverdueContacts(page: Page, label: string) {
  const user = newUser(label);
  await registerThroughUi(page, user);
  const { id: userId } = await db.user.findUniqueOrThrow({ where: { email: user.email } });
  for (const [name, days] of [["Noa", 30], ["Daniel", 20], ["Maya", 10], ["Yoni", 9]] as const) {
    await db.contact.create({
      data: { userId, name, category: "FRIEND", intervalDays: 7, lastContactedAt: daysAgo(days) },
    });
  }
  return userId;
}

const notesFor = async (userId: string, name: string) =>
  (
    await db.contact.findFirstOrThrow({ where: { userId, name }, include: { interactions: true } })
  ).interactions.map((i) => i.note);

test("the List suggests three people and records a Touch with a note", async ({ page }) => {
  const userId = await userWithOverdueContacts(page, "today-list");
  await page.goto("/");
  await page.getByRole("button", { name: "List", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Start with these 3" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Everyone else" })).toBeVisible();

  await page.getByRole("article").filter({ hasText: "Noa" }).getByRole("button", { name: "We talked" }).click();
  const sheet = page.getByRole("dialog", { name: "You talked with Noa" });
  await expect(sheet.getByRole("button", { name: "Mark as talked" })).toBeVisible();
  await sheet.getByRole("textbox", { name: "Note" }).fill("She got the keys to the new flat.");
  await sheet.getByRole("button", { name: "Save note" }).click();

  await expect(page.getByRole("status")).toHaveText("Note saved for Noa");
  await expect(sheet).toBeHidden();
  expect(await notesFor(userId, "Noa")).toEqual(["She got the keys to the new flat."]);
  // Noa is done, so two are left to suggest and the goal shows one done.
  await expect(page.getByRole("heading", { name: "Start with these 2" })).toBeVisible();
  await expect(page.getByText("1 of 3 done").filter({ visible: true })).toBeVisible();
});

test("One at a time goes person by person, and Later only skips for this visit", async ({ page }) => {
  const userId = await userWithOverdueContacts(page, "today-one");
  await db.setting.create({ data: { userId, dailyGoal: 1 } });
  await page.goto("/");
  await page.getByRole("button", { name: "One at a time", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Noa", level: 2 }).first()).toBeVisible();
  await page.getByRole("button", { name: "Later" }).first().click();
  await expect(page.getByRole("heading", { name: "Daniel", level: 2 }).first()).toBeVisible();

  await page.getByRole("button", { name: "We talked" }).first().click();
  await expect(page.getByRole("status")).toHaveText("Daniel marked as talked");
  expect(await notesFor(userId, "Daniel")).toEqual([]);
  const daniel = await db.contact.findFirstOrThrow({ where: { userId, name: "Daniel" } });
  expect(daniel.lastContactedAt!.getTime()).toBeGreaterThan(daysAgo(1).getTime());

  // A Daily goal of one is now met.
  await expect(page.getByRole("heading", { name: "That’s your one for today." })).toBeVisible();

  // The mode is remembered on this device.
  await page.reload();
  await expect(page.getByRole("button", { name: "One at a time", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("on a phone, One at a time never covers a long name with Last talked", async ({ page }) => {
  const user = newUser("today-long-name");
  await registerThroughUi(page, user);
  const { id: userId } = await db.user.findUniqueOrThrow({ where: { email: user.email } });
  await db.contact.create({
    data: { userId, name: "Dayan Partouche", category: "FRIEND", intervalDays: 15, lastContactedAt: daysAgo(40) },
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "One at a time", exact: true }).click();

  const name = page.getByRole("heading", { name: "Dayan Partouche", level: 2 }).filter({ visible: true });
  const lastTalked = page.getByText(/^Last talked on /).filter({ visible: true });
  await expect(name).toBeVisible();
  await expect(lastTalked).toBeVisible();

  const n = (await name.boundingBox())!;
  const c = (await lastTalked.boundingBox())!;
  const overlaps = n.x < c.x + c.width && c.x < n.x + n.width && n.y < c.y + c.height && c.y < n.y + n.height;
  expect(overlaps).toBe(false);
  expect(c.x + c.width).toBeLessThanOrEqual(390);
});
