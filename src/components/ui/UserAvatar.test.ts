import { describe, expect, it } from "vitest";
import { isGoogleAvatarHostname } from "./UserAvatar";

describe("isGoogleAvatarHostname", () => {
  it("accepts Google avatar subdomains", () => {
    expect(isGoogleAvatarHostname("lh3.googleusercontent.com")).toBe(true);
    expect(isGoogleAvatarHostname("googleusercontent.com")).toBe(true);
  });

  it("rejects lookalike domains", () => {
    expect(isGoogleAvatarHostname("evilgoogleusercontent.com")).toBe(false);
    expect(isGoogleAvatarHostname("notgoogle.com")).toBe(false);
  });
});
