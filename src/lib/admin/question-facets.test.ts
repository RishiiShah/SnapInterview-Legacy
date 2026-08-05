import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  groupBy: vi.fn(),
}));

vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock("@/lib/prisma", () => ({ prisma: { practiceQuestion: mocks } }));

import { getAdminQuestionFacets } from "./question-facets";

describe("getAdminQuestionFacets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.count.mockResolvedValue(1);
    mocks.groupBy.mockResolvedValue([]);
  });

  it("counts and groups only the four Q&A categories", async () => {
    await getAdminQuestionFacets();

    const expectedWhere = {
      category: { in: ["behavioral", "technical", "system-design", "leadership"] },
    };
    expect(mocks.count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(mocks.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }));
  });
});
