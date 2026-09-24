// Vitest globalSetup for the "db" project: push the Prisma schema to the test database.
import { execSync } from "node:child_process";
import { testDatabaseUrl } from "./db-url";

export default function setup() {
  const url = testDatabaseUrl();
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      env: { ...process.env, DATABASE_URL: url },
      stdio: "pipe",
    });
  } catch (err) {
    const output = err instanceof Error && "stderr" in err ? String(err.stderr) : "";
    throw new Error(
      `Could not push the schema to the test database (${new URL(url).host}). ` +
        `Is it running? Try \`npm run test:db:up\`.\n${output}`
    );
  }
}
