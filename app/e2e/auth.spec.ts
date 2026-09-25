// Sign in and Create account.
import { expect, test } from "@playwright/test";
import { newUser, registerThroughUi } from "./support/users";

test("a wrong password is refused with a message", async ({ page }) => {
  const user = newUser("auth-wrong");
  await registerThroughUi(page, user);
  await page.context().clearCookies();

  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.getByRole("alert").filter({ hasText: "Wrong email or password." })).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("signing in returns to the page that asked for it, never to another site", async ({ page }) => {
  const user = newUser("auth-callback");
  await registerThroughUi(page, user);
  await page.context().clearCookies();

  // A signed-out visit to Settings goes through sign in and back.
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fsettings/);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);

  await page.context().clearCookies();
  await page.goto("/login?callbackUrl=https%3A%2F%2Fevil.example");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});
