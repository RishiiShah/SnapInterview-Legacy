import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    interviewSession: { findMany: vi.fn(), count: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getUserNotifications } from "./notification-repo";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("getUserNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts independent notification reads before the read-marker lookup resolves", () => {
    const user = deferred<{ notificationsLastReadAt: Date | null }>();
    vi.mocked(prisma.user.findUnique).mockReturnValue(user.promise as never);
    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.interviewSession.count).mockResolvedValue(0);

    void getUserNotifications("user-1");

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { notificationsLastReadAt: true },
    });
    expect(prisma.interviewSession.findMany).toHaveBeenCalledOnce();
    expect(prisma.interviewSession.count).toHaveBeenCalledOnce();
  });
});
