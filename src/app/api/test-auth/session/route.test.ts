import { beforeEach, describe, expect, it, vi } from "vitest";

const { upsertMock } = vi.hoisted(() => ({
  upsertMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { upsert: upsertMock } },
}));

vi.mock("@/lib/route-security", () => ({
  withCsrfProtection: <T>(handler: T) => handler,
}));

vi.mock("@/lib/test-auth", () => ({
  E2E_TEST_AUTH_COOKIE: "snapinterview-test-auth",
  encodeE2ETestIdentity: vi.fn().mockResolvedValue("encoded-test-identity"),
  isTestAuthEnabled: vi.fn(() => true),
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn() },
}));

import { DELETE, POST } from "./route";

describe("test auth session route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertMock.mockResolvedValue({ id: "user-1", email: "user@example.com" });
  });

  it("creates a test session and sets its cookie", async () => {
    const response = await POST(new Request("http://localhost/api/test-auth/session", {
      method: "POST",
      body: JSON.stringify({ userId: "user-1", email: "user@example.com", name: "User" }),
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("snapinterview-test-auth=encoded-test-identity");
  });

  it("clears the test-session cookie", async () => {
    const response = await DELETE(new Request("http://localhost/api/test-auth/session", { method: "DELETE" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("snapinterview-test-auth=");
  });
});
