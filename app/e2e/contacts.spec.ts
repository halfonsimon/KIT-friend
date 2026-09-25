// Contacts: everyone in one list, searched and filtered, with "We talked" on each row.
import { expect, test, type Page } from "@playwright/test";
import { db, daysAgo } from "./support/db";
import { newUser, registerThroughUi } from "./support/users";

async function userWithContacts(page: Page, label: string) {
  const user = newUser(label);
  await registerThroughUi(page, user);
  const { id: userId } = await db.user.findUniqueOrThrow({ where: { email: user.email } });
  const people = [
    { name: "Noa", category: "FAMILY", lastContactedAt: daysAgo(30), isActive: true },
    { name: "Daniel", category: "FRIEND", lastContactedAt: daysAgo(20), isActive: true },
    { name: "Maya", category: "WORK", lastContactedAt: daysAgo(1), isActive: true },
    { name: "Avi", category: "OTHER", lastContactedAt: daysAgo(40), isActive: false },
  ] as const;
  for (const p of people) {
    await db.contact.create({ data: { userId, intervalDays: 7, ...p } });
  }
  return userId;
}

const rows = (page: Page) => page.getByRole("listitem").filter({ has: page.getByRole("button", { name: /^We talked with/ }) });

test("search and filters narrow the list", async ({ page }) => {
  await userWithContacts(page, "contacts-filter");
  await page.goto("/contacts");

  await expect(page.getByText("4 people")).toBeVisible();
  // Longest wait first; Paused people last.
  await expect(rows(page)).toHaveText([/Noa/, /Daniel/, /Maya/, /Avi/]);

  await page.getByRole("searchbox", { name: "Search contacts" }).fill("da");
  await expect(rows(page)).toHaveText([/Daniel/]);
  await page.getByRole("searchbox", { name: "Search contacts" }).fill("");

  const status = page.getByRole("group", { name: "Status" });
  await status.getByRole("button", { name: /Due now/ }).click();
  await expect(rows(page)).toHaveText([/Noa/, /Daniel/]);
  await status.getByRole("button", { name: /Paused/ }).click();
  await expect(rows(page)).toHaveText([/Avi/]);

  await status.getByRole("button", { name: /Any/ }).click();
  await page.getByRole("group", { name: "Category" }).getByRole("button", { name: /Work/ }).click();
  await expect(rows(page)).toHaveText([/Maya/]);
});

test("We talked from Contacts records a Touch", async ({ page }) => {
  const userId = await userWithContacts(page, "contacts-talk");
  await page.goto("/contacts");

  await page.getByRole("button", { name: "We talked with Daniel" }).click();
  const sheet = page.getByRole("dialog", { name: "You talked with Daniel" });
  await sheet.getByRole("button", { name: "Mark as talked" }).click();

  await expect(page.getByRole("status")).toHaveText("Daniel marked as talked");
  const daniel = await db.contact.findFirstOrThrow({ where: { userId, name: "Daniel" } });
  expect(daniel.lastContactedAt!.getTime()).toBeGreaterThan(daysAgo(1).getTime());
  // Daniel is up to date now, so he moves below Maya.
  await expect(rows(page)).toHaveText([/Noa/, /Maya/, /Daniel/, /Avi/]);
});
