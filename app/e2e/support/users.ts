// Users for end-to-end tests: each test makes its own, so no test depends on another's data.
import { expect, type Page } from "@playwright/test";
import { APP_URL } from "./env";

// Signing in or up lands on Today, the home page.
const APP_HOME = `${APP_URL}/`;

export type TestUser = { name: string; email: string; password: string };

let counter = 0;

export function newUser(label: string): TestUser {
  counter += 1;
  const id = `${Date.now().toString(36)}-${counter}`;
  return { name: `E2E ${label}`, email: `e2e-${label}-${id}@kit.test`, password: "correct-horse-1" };
}

/** Sign up through the /register form; it signs the user in and lands on Today (/). */
export async function registerThroughUi(page: Page, user: TestUser) {
  await page.goto("/register");
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(APP_HOME);
}

export async function signInThroughUi(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(APP_HOME);
}
