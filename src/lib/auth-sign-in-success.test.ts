import { describe, expect, it } from "vitest";

import {
  getSignInAfterHookUser,
  isSignInAfterHookSuccess,
} from "./auth-sign-in-success";

describe("isSignInAfterHookSuccess", () => {
  it("returns true when newSession exists", () => {
    expect(
      isSignInAfterHookSuccess({
        newSession: { user: { id: "u1", email: "a@example.com" } },
      }),
    ).toBe(true);
  });

  it("returns false when newSession is missing", () => {
    expect(isSignInAfterHookSuccess(undefined)).toBe(false);
    expect(isSignInAfterHookSuccess({})).toBe(false);
    expect(isSignInAfterHookSuccess({ newSession: null })).toBe(false);
  });

  it("does not treat legacy context.session as success", () => {
    const legacyContext = {
      session: { user: { id: "u1", email: "a@example.com" } },
    } as unknown as Parameters<typeof isSignInAfterHookSuccess>[0];

    expect(isSignInAfterHookSuccess(legacyContext)).toBe(false);
  });
});

describe("getSignInAfterHookUser", () => {
  it("returns user from newSession", () => {
    expect(
      getSignInAfterHookUser({
        newSession: { user: { id: "u1", email: "a@example.com" } },
      }),
    ).toEqual({ id: "u1", email: "a@example.com" });
  });

  it("returns undefined when sign-in failed", () => {
    expect(getSignInAfterHookUser(undefined)).toBeUndefined();
  });
});
