import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { validateRequestOrigin } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { runInterviewChat } from "@/services/interview-service";

vi.mock("@/lib/csrf", () => ({
  validateRequestOrigin: vi.fn(() => ({ isValid: true })),
}));

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/services/interview-service", () => ({
  runInterviewChat: vi.fn(),
}));

describe("POST /api/interview/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is unauthenticated", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);

    const request = new Request("http://localhost/api/interview/chat", {
      method: "POST",
      body: JSON.stringify({ interviewId: "abc", messages: [] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when interview is not owned by user", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });
    vi.mocked(runInterviewChat).mockResolvedValue({ type: "not_found" });

    const request = new Request("http://localhost/api/interview/chat", {
      method: "POST",
      body: JSON.stringify({ interviewId: "session-1", messages: [] }),
    });

    const response = await POST(request);

    expect(runInterviewChat).toHaveBeenCalledWith({
      userId: "user-1",
      interviewId: "session-1",
      rawMessages: [],
    });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Interview session not found" });
  });

  it("returns 403 when origin validation fails", async () => {
    vi.mocked(validateRequestOrigin).mockReturnValue({ isValid: false, normalizedOrigin: null });

    const request = new Request("http://localhost/api/interview/chat", {
      method: "POST",
      body: JSON.stringify({ interviewId: "session-1", messages: [] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });
});
