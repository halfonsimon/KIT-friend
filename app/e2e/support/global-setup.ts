// Playwright globalSetup: rebuild the end-to-end database from the committed
// migrations and empty Mailpit, so every run starts from nothing.
import { execSync } from "node:child_process";
import { e2eDatabaseUrl } from "./env";
import { clearMailpit } from "./mailpit";

function runPrismaCli(args: string, url: string, input?: string) {
  execSync(`npx prisma ${args}`, {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    input,
    stdio: "pipe",
  });
}

export default async function globalSetup() {
  const url = e2eDatabaseUrl();
  try {
    // migrate deploy creates the database if it doesn't exist yet.
    runPrismaCli("migrate deploy", url);
    runPrismaCli("db execute --stdin --url \"$DATABASE_URL\"", url, "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
    runPrismaCli("migrate deploy", url);
  } catch (err) {
    const output = err instanceof Error && "stderr" in err ? String(err.stderr) : "";
    throw new Error(
      `Could not prepare the end-to-end database (${new URL(url).host}). ` +
        `Is it running? Try \`npm run test:db:up\`.\n${output}`
    );
  }
  await clearMailpit();
}
