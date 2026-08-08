import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAuthClient: vi.fn(() => ({
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    useSession: vi.fn(),
    getSession: vi.fn(),
  })),
}));

vi.mock("better-auth/react", () => ({
  createAuthClient: mocks.createAuthClient,
}));

const originalPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

describe("browser auth client configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    if (originalPublicAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalPublicAppUrl;
    }
  });

  it("uses Better Auth's same-origin endpoint when no public app URL is configured", async () => {
    await import("./auth-client");

    expect(mocks.createAuthClient).toHaveBeenCalledWith({});
  });

  it("uses the explicit public app URL when one is configured", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://demo.example.com";

    await import("./auth-client");

    expect(mocks.createAuthClient).toHaveBeenCalledWith({
      baseURL: "https://demo.example.com",
    });
  });
});
