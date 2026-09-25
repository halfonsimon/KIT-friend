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

test("Add contact fills the days from the category default and adds them to the list", async ({ page }) => {
  const userId = await userWithContacts(page, "contacts-add");
  await db.setting.create({ data: { userId, defaultFamilyDays: 5 } });
  await page.goto("/contacts");
  await page.getByRole("link", { name: "Add contact" }).first().click();

  const sheet = page.getByRole("dialog", { name: "Add someone" });
  await sheet.getByLabel("Name").fill("Tamar");
  await sheet.getByText("Family", { exact: true }).click();
  await expect(sheet.getByLabel("Days between check-ins")).toHaveValue("5");
  await expect(sheet.getByText("Filled in from your Family default.")).toBeVisible();
  await sheet.getByRole("button", { name: "Add contact" }).click();

  await expect(page).toHaveURL(/\/contacts$/);
  await expect(page.getByRole("link", { name: "Tamar", exact: true })).toBeVisible();
  const tamar = await db.contact.findFirstOrThrow({ where: { userId, name: "Tamar" } });
  expect(tamar).toMatchObject({ category: "FAMILY", intervalDays: 5, isActive: true });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  /** Press on a row, move the finger by `moves`, and (unless told not to) lift it. */
  async function drag(page: Page, name: string, moves: { x: number; y: number }[], lift = true) {
    const link = page.getByRole("link", { name: new RegExp(`^${name}`) });
    const box = (await link.boundingBox())!;
    const start = { x: box.x + 20, y: box.y + box.height / 2 };
    const pointer = (x: number, y: number) => ({ pointerType: "touch", pointerId: 7, isPrimary: true, clientX: x, clientY: y });
    await link.dispatchEvent("pointerdown", pointer(start.x, start.y));
    for (const m of moves) await link.dispatchEvent("pointermove", pointer(start.x + m.x, start.y + m.y));
    if (!lift) return;
    await link.dispatchEvent("pointerup", pointer(start.x + moves.at(-1)!.x, start.y + moves.at(-1)!.y));
  }

  test("a tap with a little finger jitter opens the Contact and records nothing", async ({ page }) => {
    const userId = await userWithContacts(page, "contacts-tap");
    await page.goto("/contacts");
    const before = await db.contact.findFirstOrThrow({ where: { userId, name: "Noa" } });

    await drag(page, "Noa", [{ x: 4, y: 1 }, { x: 6, y: -2 }], false);
    // The row stays put while the finger jitters.
    await expect(page.getByRole("link", { name: /^Noa/ }).locator("..")).toHaveCSS("transform", "none");
    await drag(page, "Noa", [{ x: 6, y: -2 }]);
    await page.getByRole("link", { name: /^Noa/ }).click();

    await expect(page.getByRole("heading", { name: "Noa", level: 1 })).toBeVisible();
    const after = await db.contact.findFirstOrThrow({ where: { userId, name: "Noa" } });
    expect(after.lastContactedAt).toEqual(before.lastContactedAt);
  });

  test("a clear swipe right records a Touch", async ({ page }) => {
    const userId = await userWithContacts(page, "contacts-swipe");
    await page.goto("/contacts");

    await drag(page, "Noa", [{ x: 15, y: 2 }, { x: 60, y: 4 }, { x: 130, y: 6 }]);

    await expect(page.getByRole("status")).toHaveText("Noa marked as talked");
    await expect(page).toHaveURL(/\/contacts$/);
    const noa = await db.contact.findFirstOrThrow({ where: { userId, name: "Noa" } });
    expect(noa.lastContactedAt!.getTime()).toBeGreaterThan(daysAgo(1).getTime());
  });
});
