// The Contact page: what you know, your notes, and editing in a sheet.
import { expect, test, type Page } from "@playwright/test";
import { db, daysAgo } from "./support/db";
import { newUser, registerThroughUi } from "./support/users";

async function userWithNoa(page: Page, label: string) {
  const user = newUser(label);
  await registerThroughUi(page, user);
  const { id: userId } = await db.user.findUniqueOrThrow({ where: { email: user.email } });
  const noa = await db.contact.create({
    data: {
      userId,
      name: "Noa",
      category: "FAMILY",
      intervalDays: 3,
      phone: "+972500000001",
      lastContactedAt: daysAgo(10),
      aiSummary: "Noa moved to Florentine.",
      keyTopics: JSON.stringify(["New apartment"]),
      followUps: JSON.stringify(["Did she get the UX job?"]),
      interactions: {
        create: [
          { note: "Helped her pick paint colours.", notedAt: daysAgo(20) },
          { note: "She got the keys.", notedAt: daysAgo(10) },
        ],
      },
    },
  });
  return { userId, noa };
}

test("opens from Contacts and shows memory and notes, newest first", async ({ page }) => {
  await userWithNoa(page, "contact-view");
  await page.goto("/contacts");
  await page.getByRole("link", { name: "Noa", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Noa", level: 1 })).toBeVisible();
  await expect(page.getByText("Noa moved to Florentine.")).toBeVisible();
  await expect(page.getByText("Did she get the UX job?")).toBeVisible();
  await expect(page.getByRole("link", { name: "Call Noa" })).toHaveAttribute("href", "tel:+972500000001");
  await expect(page.getByRole("listitem").filter({ hasText: /She got the keys|paint colours/ })).toHaveText([
    /She got the keys/,
    /paint colours/,
  ]);
});

test("the Edit sheet saves changes and can pause", async ({ page }) => {
  const { noa } = await userWithNoa(page, "contact-edit");
  // The old edit address opens the sheet.
  await page.goto(`/contacts/${noa.id}/edit`);
  const sheet = page.getByRole("dialog", { name: "Edit Noa" });
  await expect(sheet).toBeVisible();

  await sheet.getByLabel("Name").fill("Noa Levi");
  await sheet.getByText("Friend", { exact: true }).click();
  await sheet.getByLabel("Days between check-ins").fill("10");
  await sheet.getByRole("switch", { name: "Pause Noa" }).click();
  await sheet.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByRole("heading", { name: "Noa Levi", level: 1 })).toBeVisible();
  await expect(page.getByText("Paused", { exact: true })).toBeVisible();
  const saved = await db.contact.findUniqueOrThrow({ where: { id: noa.id } });
  expect(saved).toMatchObject({ name: "Noa Levi", category: "FRIEND", intervalDays: 10, isActive: false });
});

test("a blank name is refused next to the field", async ({ page }) => {
  const { noa } = await userWithNoa(page, "contact-invalid");
  await page.goto(`/contacts/${noa.id}?edit=1`);
  const sheet = page.getByRole("dialog", { name: "Edit Noa" });
  await sheet.getByLabel("Name").fill(" ");
  await sheet.getByRole("button", { name: "Save changes" }).click();
  await expect(sheet.getByText("Name is required")).toBeVisible();
});

test("Delete removes the contact after confirming", async ({ page }) => {
  const { noa } = await userWithNoa(page, "contact-delete");
  await page.goto(`/contacts/${noa.id}?edit=1`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("dialog", { name: "Edit Noa" }).getByRole("button", { name: "Delete contact" }).click();

  await expect(page).toHaveURL(/\/contacts$/);
  expect(await db.contact.findUnique({ where: { id: noa.id } })).toBeNull();
});
