import { describe, expect, it } from "vitest";

import {
  buildUserSecurityActivity,
  deviceKeyFromUserAgent,
  groupActiveSessionsByDevice,
} from "./security-activity";

describe("groupActiveSessionsByDevice", () => {
  it("merges sessions that share the same user agent", () => {
    const grouped = groupActiveSessionsByDevice(
      [
        {
          id: "s1",
          userAgent: "Mozilla Chrome",
          updatedAt: new Date("2026-06-01T10:00:00Z"),
          expiresAt: new Date("2026-06-08T10:00:00Z"),
        },
        {
          id: "s2",
          userAgent: "Mozilla Chrome",
          updatedAt: new Date("2026-06-01T12:00:00Z"),
          expiresAt: new Date("2026-06-09T10:00:00Z"),
        },
        {
          id: "s3",
          userAgent: "Mozilla Safari",
          updatedAt: new Date("2026-06-01T11:00:00Z"),
          expiresAt: new Date("2026-06-08T11:00:00Z"),
        },
      ],
      "s2",
    );

    expect(grouped).toHaveLength(2);
    const chrome = grouped.find((entry) => entry.deviceKey === "Mozilla Chrome");
    expect(chrome?.sessionIds).toEqual(["s1", "s2"]);
    expect(chrome?.current).toBe(true);
    expect(chrome?.lastSeenAt.toISOString()).toBe("2026-06-01T12:00:00.000Z");
  });
});

describe("buildUserSecurityActivity", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("returns login successes and grouped failed attempts from same device", () => {
    const result = buildUserSecurityActivity(
      [
        {
          id: "1",
          type: "LOGIN_SUCCESS",
          createdAt: new Date("2026-05-31T12:00:00Z"),
          userAgent: "Chrome",
          metadata: { provider: "credentials" },
        },
        {
          id: "2",
          type: "LOGIN_FAILED",
          createdAt: new Date("2026-05-31T11:00:00Z"),
          userAgent: "Chrome",
          metadata: { reason: "invalid_credentials" },
        },
        {
          id: "3",
          type: "LOGIN_FAILED",
          createdAt: new Date("2026-05-31T10:00:00Z"),
          userAgent: "Chrome",
          metadata: { reason: "invalid_credentials" },
        },
        {
          id: "4",
          type: "LOGIN_FAILED",
          createdAt: new Date("2026-05-31T09:00:00Z"),
          userAgent: "Safari",
          metadata: { reason: "invalid_credentials" },
        },
        {
          id: "5",
          type: "SESSION_REVOKED",
          createdAt: new Date("2026-05-31T08:00:00Z"),
          userAgent: "Chrome",
          metadata: { reason: "manual_revoke" },
        },
      ],
      now,
    );

    expect(result.loginSuccesses).toHaveLength(1);
    expect(result.loginSuccesses[0]?.provider).toBe("credentials");
    expect(result.failedLoginAttempts).toHaveLength(1);
    expect(result.failedLoginAttempts[0]?.deviceKey).toBe(deviceKeyFromUserAgent("Chrome"));
    expect(result.failedLoginAttempts[0]?.attemptCount).toBe(2);
  });

  it("ignores rate-limited failures and single-attempt devices", () => {
    const result = buildUserSecurityActivity(
      [
        {
          id: "1",
          type: "LOGIN_FAILED",
          createdAt: new Date("2026-05-31T12:00:00Z"),
          userAgent: "Chrome",
          metadata: { reason: "rate_limited" },
        },
        {
          id: "2",
          type: "LOGIN_FAILED",
          createdAt: new Date("2026-05-31T11:00:00Z"),
          userAgent: "Safari",
          metadata: { reason: "invalid_credentials" },
        },
      ],
      now,
    );

    expect(result.failedLoginAttempts).toHaveLength(0);
  });
});
