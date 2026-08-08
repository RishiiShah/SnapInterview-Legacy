import { describe, expect, it } from "vitest";
import {
  companyInitials,
  displayCompany,
  resolveCompanyBrand,
  simpleIconsUrl,
} from "./company-brands";

describe("company-brands", () => {
  it("resolves known companies and aliases", () => {
    expect(resolveCompanyBrand("Google")?.slug).toBe("google");
    expect(resolveCompanyBrand("Twitter/X")?.slug).toBe("x");
    expect(resolveCompanyBrand("Meta")?.slug).toBe("meta");
    expect(resolveCompanyBrand("OpenAI")?.slug).toBe("openai");
  });

  it("returns null for unknown companies", () => {
    expect(resolveCompanyBrand("Acme Robotics")).toBeNull();
    expect(resolveCompanyBrand("")).toBeNull();
    expect(resolveCompanyBrand(null)).toBeNull();
  });

  it("uses General when company is missing", () => {
    expect(displayCompany(null)).toBe("General");
    expect(displayCompany("")).toBe("General");
    expect(displayCompany("  ")).toBe("General");
    expect(displayCompany("Stripe")).toBe("Stripe");
    expect(companyInitials(null)).toBe("GE");
  });

  it("builds initials and icon urls", () => {
    expect(companyInitials("Stripe")).toBe("ST");
    expect(companyInitials("Open AI")).toBe("OA");
    expect(simpleIconsUrl("stripe", "635BFF")).toBe(
      "https://cdn.simpleicons.org/stripe/635BFF",
    );
  });
});
