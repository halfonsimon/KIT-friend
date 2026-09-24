// End-to-end tests: the production build against a throwaway `_test` Postgres,
// with Mailpit catching every email. Run `npm run test:db:up` first.
import { defineConfig, devices } from "@playwright/test";
import {
  APP_PORT,
  APP_URL,
  CRON_SECRET,
  FROM_EMAIL,
  MAILPIT_SMTP_PORT,
  e2eDatabaseUrl,
} from "./e2e/support/env";

const databaseUrl = e2eDatabaseUrl();

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/support/global-setup.ts",
  // One database and one Mailpit are shared, so tests run one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: APP_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npx next start -p ${APP_PORT}`,
    url: `${APP_URL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Real env vars win over app/.env and app/.env.local, so nothing here can
    // reach a real database, a real inbox or Gemini.
    env: {
      DATABASE_URL: databaseUrl,
      DIRECT_URL: databaseUrl,
      AUTH_SECRET: "e2e-auth-secret",
      AUTH_URL: APP_URL,
      AUTH_TRUST_HOST: "true",
      AUTH_GOOGLE_ID: "e2e-google-id",
      AUTH_GOOGLE_SECRET: "e2e-google-secret",
      CRON_SECRET,
      SMTP_HOST: "localhost",
      SMTP_PORT: MAILPIT_SMTP_PORT,
      SMTP_USER: "e2e",
      SMTP_PASS: "e2e",
      FROM_EMAIL,
      GEMINI_API_KEY: "",
    },
  },
});
