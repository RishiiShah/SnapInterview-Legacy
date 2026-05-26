import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { recordSecurityEvent } from "@/lib/account-security";
import { extractRequestContext } from "@/lib/security";
import { getServerAuthSession } from "@/lib/server-auth";
import { csrfRejectIfInvalid } from "@/lib/csrf";

const { deleteAccountLimitedMock } = vi.hoisted(() => ({
  deleteAccountLimitedMock: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({ isLimited: deleteAccountLimitedMock })),
}));

vi.mock("@/lib/server-auth", () => ({
  getServerAuthSession: vi.fn(),
}));

vi.mock("@/lib/security", () => ({
  extractRequestContext: vi.fn(() => ({ ipHash: "hashed-ip", userAgent: "agent" })),
}));

vi.mock("@/lib/account-security", () => ({
  recordSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/password", () => ({
  verifyCredentialPassword: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
    },
  },
}));

describe("DELETE /api/delete-account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteAccountLimitedMock.mockResolvedValue(false);
  });

  it("short-circuits when CSRF validation fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const request = new Request("http://localhost/api/delete-account", {
      method: "DELETE",
      body: JSON.stringify({ confirm: "DELETE", currentPassword: "pw" }),
    });

    const res = await DELETE(request);

    expect(res.status).toBe(403);
    expect(getServerAuthSession).not.toHaveBeenCalled();
  });

  it("requires an authenticated user", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue(null as never);

    const request = new Request("http://localhost/api/delete-account", {
      method: "DELETE",
      body: JSON.stringify({ confirm: "DELETE", currentPassword: "pw" }),
    });

    const res = await DELETE(request);

    expect(res.status).toBe(401);
  });

  it("rate limits account deletion attempts per authenticated user", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
    } as never);
    deleteAccountLimitedMock.mockResolvedValue(true);

    const request = new Request("http://localhost/api/delete-account", {
      method: "DELETE",
      body: JSON.stringify({ confirm: "DELETE", currentPassword: "pw" }),
    });

    const res = await DELETE(request);

    expect(res.status).toBe(429);
    expect(deleteAccountLimitedMock).toHaveBeenCalledWith("user-1");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('requires confirm to be "DELETE" and a current password', async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { email: "user@example.com" },
    } as never);

    const request = new Request("http://localhost/api/delete-account", {
      method: "DELETE",
      body: JSON.stringify({ confirm: "WRONG", currentPassword: "" }),
    });

    const res = await DELETE(request);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("Invalid input"),
    });
  });

  it("rejects when the user account has no password-based credentials", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { email: "user@example.com" },
    } as never);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    } as never);

    vi.mocked(prisma.account.findFirst).mockResolvedValue(null as never);

    const request = new Request("http://localhost/api/delete-account", {
      method: "DELETE",
      body: JSON.stringify({ confirm: "DELETE", currentPassword: "pw" }),
    });

    const res = await DELETE(request);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("not available for this account"),
    });
  });

  it("rejects when the current password is incorrect", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { email: "user@example.com" },
    } as never);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    } as never);

    vi.mocked(prisma.account.findFirst).mockResolvedValue({
      id: "acct-1",
      password: "hashed",
    } as never);

    const { verifyCredentialPassword } = await import("@/lib/password");
    vi.mocked(verifyCredentialPassword).mockResolvedValue(false as never);

    const request = new Request("http://localhost/api/delete-account", {
      method: "DELETE",
      body: JSON.stringify({ confirm: "DELETE", currentPassword: "wrong" }),
    });

    const res = await DELETE(request);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Current password is incorrect.",
    });
  });

  it("deletes the user and records a security event when password is valid", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { email: "user@example.com" },
    } as never);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    } as never);

    vi.mocked(prisma.account.findFirst).mockResolvedValue({
      id: "acct-1",
      password: "hashed",
    } as never);

    const { verifyCredentialPassword } = await import("@/lib/password");
    vi.mocked(verifyCredentialPassword).mockResolvedValue(true as never);

    const request = new Request("http://localhost/api/delete-account", {
      method: "DELETE",
      body: JSON.stringify({ confirm: "DELETE", currentPassword: "correct" }),
    });

    const res = await DELETE(request);

    expect(res.status).toBe(200);
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
    expect(recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ACCOUNT_DELETED",
        email: "user@example.com",
        metadata: expect.objectContaining({ reason: "account_deleted" }),
      }),
    );
    expect(extractRequestContext).toHaveBeenCalled();
  });
});
