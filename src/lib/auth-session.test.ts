import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentSessionRecord, getSessionTokenFromCookieHeader, getSessionTokenFromRequest } from "./auth-session";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
    },
  },
}));

describe("auth-session helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts a session token from supported cookie names", () => {
    expect(
      getSessionTokenFromCookieHeader(
        "foo=bar; __Secure-next-auth.session-token=abc123; theme=dark"
      )
    ).toBe("abc123");

    expect(
      getSessionTokenFromCookieHeader(
        "foo=bar; authjs.session-token=token%20with%20spaces"
      )
    ).toBe("token with spaces");
  });

  it("returns null when request has no supported session cookie", async () => {
    const request = new Request("http://localhost/test");

    expect(getSessionTokenFromRequest(request)).toBeNull();
    await expect(getCurrentSessionRecord(request)).resolves.toBeNull();
    expect(prisma.session.findUnique).not.toHaveBeenCalled();
  });

  it("loads the current session record by extracted session token", async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: "session-1",
      sessionToken: "abc123",
      userId: "user-1",
      expires: new Date("2026-03-20T00:00:00.000Z"),
      revokedAt: null,
    } as Awaited<ReturnType<typeof prisma.session.findUnique>>);

    const request = new Request("http://localhost/test", {
      headers: {
        cookie: "foo=bar; next-auth.session-token=abc123",
      },
    });

    await expect(getCurrentSessionRecord(request)).resolves.toEqual({
      id: "session-1",
      sessionToken: "abc123",
      userId: "user-1",
      expires: new Date("2026-03-20T00:00:00.000Z"),
      revokedAt: null,
    });
    expect(prisma.session.findUnique).toHaveBeenCalledWith({
      where: { sessionToken: "abc123" },
      select: {
        id: true,
        sessionToken: true,
        userId: true,
        expires: true,
        revokedAt: true,
      },
    });
  });
});
