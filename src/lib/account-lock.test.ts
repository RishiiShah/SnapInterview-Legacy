import { describe, expect, it } from "vitest";

import { isAccountLocked } from "./account-lock";

describe("isAccountLocked", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("returns true when lockedUntil is in the future", () => {
    expect(isAccountLocked(new Date("2026-06-01T13:00:00Z"), now)).toBe(true);
  });

  it("returns false when lock expired or unset", () => {
    expect(isAccountLocked(null, now)).toBe(false);
    expect(isAccountLocked(new Date("2026-06-01T11:00:00Z"), now)).toBe(false);
  });
});
