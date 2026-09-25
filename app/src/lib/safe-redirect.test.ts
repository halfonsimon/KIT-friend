import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "./safe-redirect";

describe("safeCallbackUrl", () => {
  it("keeps paths inside the app, with their query", () => {
    expect(safeCallbackUrl("/contacts")).toBe("/contacts");
    expect(safeCallbackUrl("/contacts/abc?edit=1")).toBe("/contacts/abc?edit=1");
  });

  it("sends anything else to Today", () => {
    for (const value of [null, undefined, "", "https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "contacts"]) {
      expect(safeCallbackUrl(value)).toBe("/");
    }
  });
});
