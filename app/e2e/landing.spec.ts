// Signed out, "/" is the landing page; signed in, it's Today.
import { expect, test } from "@playwright/test";
import { newUser, registerThroughUi } from "./support/users";

test("signed out, / is the landing page and leads to an account", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Who should you call today?", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  // The app's navigation is not shown to visitors.
  await expect(page.getByRole("link", { name: "Contacts" })).toHaveCount(0);

  await page.getByRole("main").getByRole("link", { name: "Create an account" }).first().click();
  await expect(page).toHaveURL(/\/register$/);
  await page.goBack();
  await page.getByRole("banner").getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("signed in, / is Today", async ({ page }) => {
  await registerThroughUi(page, newUser("landing-signed-in"));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Who should you call today?" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Contacts" }).first()).toBeVisible();
});
