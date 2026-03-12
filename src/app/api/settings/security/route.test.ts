import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "./route";
import { NextResponse } from "next/server";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
  getCurrentSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    securityEvent: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      revokeOtherSessions: vi.fn(),
      revokeSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/account-security", () => ({
  recordSecurityEvent: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

describe("PATCH /api/settings/security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when CSRF validation fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const request = new Request("http://localhost/api/settings/security", {
      method: "PATCH",
      body: JSON.stringify({ action: "revokeOthers" }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(403);
    expect(getSessionUserIdentity).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });
});
