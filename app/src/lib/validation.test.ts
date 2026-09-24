import { describe, expect, it } from "vitest";
import { CATEGORY_VALUES } from "./contact";
import { ContactFormSchema } from "./validation";

const validContactForm = { name: "Ada", phone: "", category: "FRIEND", intervalDays: "", isActive: true };

function errorFor(input: unknown, field: string) {
  const result = ContactFormSchema.safeParse(input);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe("ContactFormSchema", () => {
  it("trims the name and requires it", () => {
    expect(ContactFormSchema.parse({ ...validContactForm, name: "  Ada  " }).name).toBe("Ada");
    expect(errorFor({ ...validContactForm, name: "   " }, "name")).toBe("Name is required");
  });

  it("treats an empty phone as absent and trims a given one", () => {
    expect(ContactFormSchema.parse({ ...validContactForm, phone: "" }).phone).toBeUndefined();
    expect(ContactFormSchema.parse({ ...validContactForm, phone: " +33 6 12 " }).phone).toBe("+33 6 12");
  });

  it("coerces a numeric interval string to a number", () => {
    expect(ContactFormSchema.parse({ ...validContactForm, intervalDays: "14" }).intervalDays).toBe(14);
    expect(ContactFormSchema.parse({ ...validContactForm, intervalDays: 30 }).intervalDays).toBe(30);
  });

  it("treats an empty or non-numeric interval as absent, meaning the Category default", () => {
    expect(ContactFormSchema.parse({ ...validContactForm, intervalDays: "" }).intervalDays).toBeUndefined();
    expect(ContactFormSchema.parse({ ...validContactForm, intervalDays: "abc" }).intervalDays).toBeUndefined();
    expect(ContactFormSchema.parse({ ...validContactForm, intervalDays: undefined }).intervalDays).toBeUndefined();
  });

  it("rejects an interval below one day", () => {
    expect(errorFor({ ...validContactForm, intervalDays: -3 }, "intervalDays")).toBe("Interval must be ≥ 1");
    expect(errorFor({ ...validContactForm, intervalDays: 0 }, "intervalDays")).toBe("Interval must be ≥ 1");
    expect(errorFor({ ...validContactForm, intervalDays: "-3" }, "intervalDays")).toBe("Interval must be ≥ 1");
    expect(errorFor({ ...validContactForm, intervalDays: "0" }, "intervalDays")).toBe("Interval must be ≥ 1");
  });

  it("accepts every Category and rejects unknown ones", () => {
    for (const category of CATEGORY_VALUES) {
      expect(ContactFormSchema.safeParse({ ...validContactForm, category }).success).toBe(true);
    }
    expect(errorFor({ ...validContactForm, category: "ENEMY" }, "category")).toBeDefined();
  });
});
