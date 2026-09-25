// Loading screens: every tap shows the next screen's shape at once, even when
// the server is slow, and signed-out visitors never see a signed-in one.
import { expect, test, type Page } from "@playwright/test";
import { db, daysAgo } from "./support/db";
import { newUser, registerThroughUi } from "./support/users";

/** Hold back page renders (not prefetches) so the loading screen stays up. */
async function slowServer(page: Page, ms = 1500) {
  await page.route("**/*", async (route) => {
    const headers = route.request().headers();
    if (headers["rsc"] && !headers["next-router-prefetch"]) await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });
}

async function signedInWithNoa(page: Page, label: string) {
  const user = newUser(label);
  await registerThroughUi(page, user);
  const { id: userId } = await db.user.findUniqueOrThrow({ where: { email: user.email } });
  return db.contact.create({ data: { userId, name: "Noa", intervalDays: 7, lastContactedAt: daysAgo(10) } });
}

test("tapping a Contact shows its loading screen before the page arrives", async ({ page }) => {
  await signedInWithNoa(page, "loading-contact");
  await page.goto("/contacts");
  await page.waitForLoadState("networkidle");
  await slowServer(page);

  await page.getByRole("link", { name: "Noa", exact: true }).click();

  await expect(page.getByRole("status", { name: "Loading contact" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Noa", level: 1 })).toBeVisible();
  await expect(page.getByRole("status", { name: "Loading contact" })).toHaveCount(0);
});

test("switching tabs shows each screen's loading screen", async ({ page }) => {
  await signedInWithNoa(page, "loading-tabs");
  await page.waitForLoadState("networkidle");
  await slowServer(page);
  const nav = page.getByRole("navigation", { name: "Main" });

  await nav.getByRole("link", { name: "Contacts" }).click();
  await expect(page.getByRole("status", { name: "Loading contacts" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Contacts", level: 1 })).toBeVisible();

  await nav.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("status", { name: "Loading settings" })).toBeVisible();
  await expect(page).toHaveURL(/\/settings$/);

  await nav.getByRole("link", { name: "Today" }).click();
  await expect(page.getByRole("status", { name: "Loading Today" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Start with Noa" })).toBeVisible();
});

test("signed out, the landing page never shows a loading screen", async ({ request }) => {
  const html = await (await request.get("/")).text();
  // Next's router data (in scripts) names the loading screen; the page itself must not render it.
  const rendered = html.replace(/<script[\s\S]*?<\/script>/g, "");

  expect(rendered).toContain("Who should you call today?");
  expect(rendered).not.toContain("Loading Today");
});
