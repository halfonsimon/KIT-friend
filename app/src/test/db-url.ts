// Resolve the database URL used by database-backed tests.
// Never falls back to DATABASE_URL: the name must end in "_test" so a dev or
// production database can't be truncated by accident.

const DEFAULT_TEST_DATABASE_URL =
  "postgresql://kit:kit@localhost:54329/kit_friend_test";

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL || DEFAULT_TEST_DATABASE_URL;
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests against "${dbName}": the test database name must end in "_test".`
    );
  }
  return url;
}
