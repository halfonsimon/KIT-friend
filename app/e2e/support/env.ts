// Where the end-to-end tests run: the app on its own port, a throwaway `_test`
// Postgres database and Mailpit. CI overrides the URLs through the environment.

export const APP_PORT = 3100;
export const APP_URL = `http://localhost:${APP_PORT}`;

export const CRON_SECRET = "e2e-cron-secret";
export const FROM_EMAIL = "digest@kit.test";

const DEFAULT_E2E_DATABASE_URL = "postgresql://kit:kit@localhost:54329/kit_friend_e2e_test";

/** Never falls back to DATABASE_URL: the name must end in "_test", like the db tests. */
export function e2eDatabaseUrl(): string {
  const url = process.env.E2E_DATABASE_URL || DEFAULT_E2E_DATABASE_URL;
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName.endsWith("_test")) {
    throw new Error(
      `Refusing to run end-to-end tests against "${dbName}": the database name must end in "_test".`
    );
  }
  return url;
}

export const MAILPIT_URL = process.env.MAILPIT_URL || "http://localhost:54380";
export const MAILPIT_SMTP_PORT = process.env.MAILPIT_SMTP_PORT || "54325";
