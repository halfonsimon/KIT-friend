// Settings: every change saves by itself; today's email is previewed beside it.
import { expect, test, type Page } from "@playwright/test";
import { db, daysAgo } from "./support/db";
import { newUser, registerThroughUi } from "./support/users";

async function signedInUser(page: Page, label: string) {
  const user = newUser(label);
  await registerThroughUi(page, user);
  const { id: userId } = await db.user.findUniqueOrThrow({ where: { email: user.email } });
  return { user, userId };
}

const settingsOf = (userId: string) => db.setting.findUniqueOrThrow({ where: { userId } });

test("changes save by themselves", async ({ page }) => {
  const { userId } = await signedInUser(page, "settings-save");
  await page.goto("/settings");

  await page.getByRole("button", { name: "5 a day" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  expect((await settingsOf(userId)).dailyGoal).toBe(5);

  await page.getByRole("switch", { name: "Send me a daily email" }).click();
  await page.getByRole("group", { name: "Work default" }).getByRole("button", { name: "More" }).click();
  await expect.poll(async () => (await settingsOf(userId)).defaultWorkDays).toBe(15);
  expect((await settingsOf(userId)).sendEmailDigest).toBe(false);

  // Saved for real: a reload shows the same values.
  await page.reload();
  await expect(page.getByRole("button", { name: "5 a day" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("switch", { name: "Send me a daily email" })).toHaveAttribute("aria-checked", "false");
});

test("an invalid email is refused next to the field and not saved", async ({ page }) => {
  const { userId } = await signedInUser(page, "settings-invalid");
  await page.goto("/settings");

  const sendTo = page.getByRole("textbox", { name: "Send to" });
  await sendTo.fill("not-an-email");
  await sendTo.blur();

  await expect(page.getByText("Enter a valid email address, or leave it blank")).toBeVisible();
  expect(await db.setting.findUnique({ where: { userId } })).toBeNull();

  await sendTo.fill("inbox@example.com");
  await sendTo.blur();
  await expect.poll(async () => (await db.setting.findUnique({ where: { userId } }))?.digestEmail).toBe("inbox@example.com");
  await expect(page.getByText("Enter a valid email address")).toBeHidden();
});

test("today's email lists who is due, sent to the chosen address", async ({ page }) => {
  const { userId } = await signedInUser(page, "settings-preview");
  await db.setting.create({ data: { userId, digestEmail: "inbox@example.com" } });
  await db.contact.create({ data: { userId, name: "Noa", intervalDays: 7, lastContactedAt: daysAgo(10) } });
  await page.goto("/settings");

  const preview = page.getByRole("complementary", { name: "Today’s email" });
  await expect(preview.getByText("to inbox@example.com")).toBeVisible();
  await expect(preview.getByText("Keep In Touch — 1 overdue, 0 today")).toBeVisible();
  await expect(preview.getByRole("listitem").filter({ hasText: "Noa" })).toContainText("3d overdue");
});
