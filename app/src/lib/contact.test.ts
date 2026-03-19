import { describe, expect, it } from "vitest";
import {
  buildContactContext,
  parseStoredStringArray,
  readStoredAiMemory,
} from "./contact";

describe("parseStoredStringArray", () => {
  it("returns trimmed string values for valid JSON arrays", () => {
    expect(parseStoredStringArray('[" job change ","Paris",123,null,""]')).toEqual([
      "job change",
      "Paris",
    ]);
  });

  it("falls back to an empty array for malformed JSON", () => {
    expect(parseStoredStringArray("not json")).toEqual([]);
  });
});

describe("readStoredAiMemory", () => {
  it("never throws on malformed stored AI fields", () => {
    expect(
      readStoredAiMemory({
        aiSummary: "Summary",
        keyTopics: "{broken",
        followUps: null,
      })
    ).toEqual({
      aiSummary: "Summary",
      keyTopics: [],
      followUps: [],
    });
  });
});

describe("buildContactContext", () => {
  it("normalizes category and filters empty notes", () => {
    const context = buildContactContext({
      name: "Sam",
      category: "UNKNOWN",
      aiSummary: null,
      keyTopics: '["Launch"]',
      followUps: '["Ask about timeline"]',
      interactions: [
        { note: "  Talked about launch  ", notedAt: new Date("2025-01-01T00:00:00Z") },
        { note: "", notedAt: new Date("2025-01-02T00:00:00Z") },
        { note: null, notedAt: new Date("2025-01-03T00:00:00Z") },
      ],
    });

    expect(context.category).toBe("FRIEND");
    expect(context.existingTopics).toEqual(["Launch"]);
    expect(context.existingFollowUps).toEqual(["Ask about timeline"]);
    expect(context.recentInteractions).toEqual([
      {
        note: "Talked about launch",
        date: new Date("2025-01-01T00:00:00Z"),
      },
    ]);
  });
});
