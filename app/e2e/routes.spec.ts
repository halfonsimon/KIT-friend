// The route handlers' own checks, over real HTTP against the running app:
// no mocked auth(), real proxy, real cookies, email caught by Mailpit.
import { expect, test, type APIRequestContext, type APIResponse } from "@playwright/test";
import { db, daysAgo, utcTimeNow } from "./support/db";
import { APP_URL, CRON_SECRET } from "./support/env";
import { caughtMailFor, clearMailpit, expectMailTo } from "./support/mailpit";
import { newUser, signInThroughUi, type TestUser } from "./support/users";

test.beforeEach(clearMailpit);

/** Register through the API and return the new user's id. */
async function register(request: APIRequestContext, user: TestUser) {
  const res = await request.post("/api/register", { data: user });
  expect(res.status()).toBe(200);
  return (await db.user.findUniqueOrThrow({ where: { email: user.email } })).id;
}

async function createOverdueContact(userId: string, name: string) {
  return db.contact.create({
    data: { userId, name, category: "FRIEND", intervalDays: 7, createdAt: daysAgo(10) },
  });
}

/** A new user with an overdue Contact whose digest time is now (UTC), inside the ±30 min send window. */
async function userDueForDigest(request: APIRequestContext, label: string) {
  const user = newUser(label);
  const userId = await register(request, user);
  await createOverdueContact(userId, "Ada Lovelace");
  await db.setting.create({ data: { userId, digestTime: utcTimeNow() } });
  return user;
}

/** The route gate's answer to a request without a session: a redirect to /login. */
function expectSentToLogin(res: APIResponse) {
  expect(res.status()).toBe(307);
  expect(new URL(res.headers().location ?? "", APP_URL).pathname).toBe("/login");
}

const cronRun = (request: APIRequestContext, bearer?: string) =>
  request.post("/api/digest/send", {
    headers: bearer === undefined ? {} : { authorization: `Bearer ${bearer}` },
    maxRedirects: 0,
  });

test.describe("scheduled Digest (cron mode)", () => {
  test("sends a due user's Digest once per UTC day", async ({ request }) => {
    const user = await userDueForDigest(request, "cron");

    const first = await cronRun(request, CRON_SECRET);
    expect(first.status()).toBe(200);
    const { results } = await first.json();
    expect(results).toContainEqual(expect.objectContaining({ email: user.email, status: "sent" }));

    const [mail] = await expectMailTo(user.email, 1);
    expect(mail.subject).toBe("Keep In Touch — 1 overdue, 0 today");
    expect(mail.html).toContain("Ada Lovelace");

    const second = await cronRun(request, CRON_SECRET);
    expect((await second.json()).results).toContainEqual(
      expect.objectContaining({ email: user.email, status: "already_sent_today" })
    );
    await expectMailTo(user.email, 1);
  });

  test("a wrong or missing CRON_SECRET without a session is sent to /login, and nothing is sent", async ({
    request,
  }) => {
    const user = await userDueForDigest(request, "cron-denied");

    // The route gate stops the request before the route: no session, no valid bearer.
    for (const bearer of ["wrong-secret", undefined]) {
      expectSentToLogin(await cronRun(request, bearer));
    }
    expect(await caughtMailFor(user.email)).toEqual([]);
  });

  test("a signed-in user with a wrong or missing CRON_SECRET gets 401 from the route, and nothing is sent", async ({
    page,
  }) => {
    const user = await userDueForDigest(page.request, "cron-session");
    await signInThroughUi(page, user);

    const wrongOrMissing: Record<string, string>[] = [{ authorization: "Bearer wrong-secret" }, {}];
    for (const headers of wrongOrMissing) {
      const res = await page.request.post("/api/digest/send", { headers });
      expect(res.status()).toBe(401);
    }
    expect(await caughtMailFor(user.email)).toEqual([]);
  });
});

test.describe("signed-out requests", () => {
  test("Send Digest (?test=true) and Touch are sent to /login", async ({ request }) => {
    expectSentToLogin(await request.post("/api/digest/send?test=true", { maxRedirects: 0 }));
    expectSentToLogin(await request.post("/api/contacts/any-id/touch", { maxRedirects: 0 }));
  });
});

test.describe("registration", () => {
  test("rejects an email that already has an account with 409", async ({ request }) => {
    const user = newUser("dup");
    await register(request, user);

    const again = await request.post("/api/register", {
      data: { ...user, email: user.email.toUpperCase() },
    });
    expect(again.status()).toBe(409);
  });

  test("rejects an email that already has an account with 409 when padded with spaces", async ({ request }) => {
    const user = newUser("dup-padded");
    await register(request, user);

    const again = await request.post("/api/register", {
      data: { ...user, email: `  ${user.email} ` },
    });
    expect(again.status()).toBe(409);
  });

  test("an account registered with a padded email signs in with the clean one", async ({ page }) => {
    const user = newUser("padded");
    const res = await page.request.post("/api/register", {
      data: { ...user, email: `  ${user.email.toUpperCase()} ` },
    });
    expect(res.status()).toBe(200);

    await signInThroughUi(page, user);
  });

  test("rejects a password under 8 characters with 400", async ({ request }) => {
    const res = await request.post("/api/register", {
      data: { ...newUser("short"), password: "1234567" },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("ownership", () => {
  test("a user can't record a Touch on another user's Contact", async ({ page }) => {
    const owner = newUser("owner");
    const ownerId = await register(page.request, owner);
    const contact = await createOverdueContact(ownerId, "Ada Lovelace");

    const intruder = newUser("intruder");
    await register(page.request, intruder);
    await signInThroughUi(page, intruder);

    const res = await page.request.post(`/api/contacts/${contact.id}/touch`, {
      data: { note: "not mine" },
    });
    expect(res.status()).toBe(404);

    const after = await db.contact.findUniqueOrThrow({
      where: { id: contact.id },
      include: { interactions: true },
    });
    expect(after.lastContactedAt).toBeNull();
    expect(after.interactions).toEqual([]);
  });
});
