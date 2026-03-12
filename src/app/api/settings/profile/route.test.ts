import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

describe("PUT /api/settings/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is unauthenticated", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);

    const request = new Request("http://localhost/api/settings/profile", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ name: "Rishi" }),
    });

    const response = await PUT(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid display name", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });

    const request = new Request("http://localhost/api/settings/profile", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ name: "   " }),
    });

    const response = await PUT(request);

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Display name is required" });
  });

  it("returns updated profile details", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "user-1",
      name: "Rishi Patel",
      email: "user@example.com",
      image: null,
    } as any);

    const request = new Request("http://localhost/api/settings/profile", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ name: "Rishi Patel" }),
    });

    const response = await PUT(request);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "Rishi Patel" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: {
        id: "user-1",
        name: "Rishi Patel",
        email: "user@example.com",
        image: null,
      },
    });
  });

  it("returns 404 when the user no longer exists", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    const notFoundError = Object.assign(new Error("missing"), { code: "P2025" });
    vi.mocked(prisma.user.update).mockRejectedValue(notFoundError);

    const request = new Request("http://localhost/api/settings/profile", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ name: "Rishi Patel" }),
    });

    const response = await PUT(request);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "User not found" });
  });
});