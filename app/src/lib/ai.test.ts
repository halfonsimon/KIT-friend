import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildMemoryPrompt } from "./ai";
import type { ContactContext } from "./contact";

describe("buildMemoryPrompt", () => {
  // Tokyo is UTC+9, so a note from just before midnight UTC is already the next day there.
  const originalTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "Asia/Tokyo";
  });
  afterAll(() => {
    process.env.TZ = originalTz;
  });

  const context: ContactContext = {
    name: "Ada Lovelace",
    category: "FRIEND",
    existingSummary: null,
    existingTopics: [],
    existingFollowUps: [],
    recentInteractions: [{ note: "Moving to Paris", date: new Date("2026-03-31T23:30:00Z") }],
  };

  it("dates each recent Interaction by its UTC day, whatever the server's timezone", () => {
    const prompt = buildMemoryPrompt("Got the job", context);

    expect(prompt).toContain("- 31 March 2026: Moving to Paris");
    expect(prompt).not.toContain("April");
  });
});
