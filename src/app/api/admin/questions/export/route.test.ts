import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSessionOrNull: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminSessionOrNull: mocks.getAdminSessionOrNull }));
vi.mock("@/lib/prisma", () => ({ prisma: { practiceQuestion: { findMany: mocks.findMany } } }));

import { GET } from "./route";

describe("GET /api/admin/questions/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminSessionOrNull.mockResolvedValue({ user: { id: "admin" } });
    mocks.findMany.mockResolvedValue([]);
  });

  it("exports only Q&A categories", async () => {
    await GET(new Request("http://localhost/api/admin/questions/export?format=json"));

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { category: { in: ["behavioral", "technical", "system-design", "leadership"] } },
    }));
  });
});
