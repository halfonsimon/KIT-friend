import path from "node:path";
import { defineConfig } from "vitest/config";
import { testDatabaseUrl } from "./src/test/db-url";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    // Reported on every PR, never enforced (no thresholds).
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.ts", "src/test/**", "src/types/**"],
      reporter: ["text-summary", "html", "json-summary", "json"],
      reportOnFailure: true,
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.db.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: ["src/**/*.db.test.ts"],
          globalSetup: ["src/test/db-global-setup.ts"],
          setupFiles: ["src/test/db-setup.ts"],
          env: { DATABASE_URL: testDatabaseUrl() },
          fileParallelism: false,
        },
      },
    ],
  },
});
