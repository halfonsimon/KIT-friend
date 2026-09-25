// The main journey, end to end: sign up, add Contacts, record a Touch, send the
// Digest, and read the email Mailpit caught (nothing reaches a real inbox).
import { expect, test } from "@playwright/test";
import { db, daysAgo } from "./support/db";
import { clearMailpit, expectMailTo } from "./support/mailpit";
import { newUser, registerThroughUi, signInThroughUi } from "./support/users";

test.beforeEach(clearMailpit);

test("a new user adds Contacts, records a Touch and receives the Digest", async ({ page }) => {
  const user = newUser("journey");
  await registerThroughUi(page, user);
  // Registering signs the user in; sign in again through the login form too.
  await page.context().clearCookies();
  await signInThroughUi(page, user);

  for (const name of ["Ada Lovelace", "Grace Hopper"]) {
    await page.goto("/contacts/new");
    const sheet = page.getByRole("dialog", { name: "Add someone" });
    await sheet.getByLabel("Name").fill(name);
    await sheet.getByText("Friend", { exact: true }).click();
    await sheet.getByLabel("Days between check-ins").fill("7");
    await sheet.getByRole("button", { name: "Add contact" }).click();
    await expect(page).toHaveURL(/\/contacts$/);
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  }

  // A Contact added through the UI is never due yet, so make Ada's last Touch
  // long enough ago that she is overdue.
  await db.contact.updateMany({
    where: { name: "Ada Lovelace", user: { email: user.email } },
    data: { createdAt: daysAgo(10) },
  });

  // Record a Touch with a note on Grace.
  await page.reload();
  await page.getByRole("button", { name: "We talked with Grace Hopper" }).click();
  const sheet = page.getByRole("dialog", { name: "You talked with Grace Hopper" });
  await sheet.getByRole("textbox", { name: "Note" }).fill("Coffee, talked about COBOL.");
  const touched = page.waitForResponse((r) => r.url().includes("/touch") && r.request().method() === "POST");
  await sheet.getByRole("button", { name: "Save note" }).click();
  expect((await touched).status()).toBe(200);

  const grace = await db.contact.findFirstOrThrow({
    where: { name: "Grace Hopper", user: { email: user.email } },
    include: { interactions: true },
  });
  expect(grace.lastContactedAt).not.toBeNull();
  expect(grace.interactions.map((i) => i.note)).toEqual(["Coffee, talked about COBOL."]);

  // Send the Digest from the digest page.
  await page.goto("/digest");
  await page.getByRole("button", { name: "Send Test Email" }).click();
  await expect(page.getByText(`Sent to: ${user.email}`)).toBeVisible();

  const [mail] = await expectMailTo(user.email, 1);
  expect(mail.subject).toBe("Keep In Touch — 1 overdue, 0 today");
  const overdue = mail.html.split("Overdue</h2>")[1]?.split("</table>")[0] ?? "";
  expect(overdue).toContain("Ada Lovelace");
  expect(overdue).not.toContain("Grace Hopper");
});
