// Vitest globalSetup for the "db" project: rebuild the test database from the
// committed migrations, then fail if schema.prisma has changes no migration covers.
import { execSync } from "node:child_process";
import { testDatabaseUrl } from "./db-url";

function prisma(args: string, url: string, input?: string) {
  execSync(`npx prisma ${args}`, {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    input,
    stdio: "pipe",
  });
}

function stderrOf(err: unknown) {
  return err instanceof Error && "stderr" in err ? String(err.stderr) : "";
}

export default function setup() {
  const url = testDatabaseUrl();
  try {
    // Start empty (the URL is guaranteed to be a `_test` database), then apply migrations.
    prisma("db execute --stdin --url \"$DATABASE_URL\"", url, "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
    prisma("migrate deploy", url);
  } catch (err) {
    throw new Error(
      `Could not apply the migrations to the test database (${new URL(url).host}). ` +
        `Is it running? Try \`npm run test:db:up\`.\n${stderrOf(err)}`
    );
  }

  try {
    prisma(
      "migrate diff --from-url \"$DATABASE_URL\" --to-schema-datamodel prisma/schema.prisma --exit-code",
      url
    );
  } catch (err) {
    throw new Error(
      "schema.prisma has changes that no migration covers. " +
        "Create one with `npx prisma migrate dev --name <change>` against a development database.\n" +
        stderrOf(err)
    );
  }
}
