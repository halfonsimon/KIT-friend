import { describe, expect, it } from "vitest";
import type { DigestData } from "./digest";
import { renderDigestEmail } from "./email";

describe("renderDigestEmail", () => {
  const empty: DigestData = {
    overdue: [],
    today: [],
    upcoming: [],
    stats: { overdue: 0, today: 0, upcoming: 0, total: 0 },
  };

  it("says in the footer that Paused Contacts are left out", () => {
    const { html } = renderDigestEmail(empty, new Date("2026-09-26T08:00:00Z"));

    expect(html).toContain("Paused Contacts are left out.");
  });
});
