import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getServerAuthSession } from "@/lib/server-auth";

vi.mock("@/lib/server-auth", () => ({ getServerAuthSession: vi.fn() }));
vi.mock("@/lib/csrf", () => ({ csrfRejectIfInvalid: vi.fn(() => null) }));
vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({ isLimited: vi.fn(() => false) })),
}));

describe("POST /api/support/ticket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("rejects an oversized support message before sending email", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com", name: "User" },
    } as never);

    const formData = new FormData();
    formData.set("category", "technical");
    formData.set("priority", "normal");
    formData.set("subject", "Need help");
    formData.set("description", "x".repeat(10_001));

    const response = await POST(new Request("http://localhost/api/support/ticket", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: formData,
    }) as never);

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON before sending email", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com", name: "User" },
    } as never);

    const response = await POST(new Request("http://localhost/api/support/ticket", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: "{",
    }) as never);

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an attachment whose bytes are not an allowed image", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com", name: "User" },
    } as never);

    const formData = new FormData();
    formData.set("category", "technical");
    formData.set("priority", "normal");
    formData.set("subject", "Need help");
    formData.set("description", "The attachment should be rejected.");
    formData.set("attachment", new File([new Uint8Array([0x4d, 0x5a, 0x90, 0x00])], "screen.png", { type: "image/png" }));

    const response = await POST(new Request("http://localhost/api/support/ticket", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: formData,
    }) as never);

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards a support ticket and image to Formspree as multipart data", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com", name: "User Name" },
    } as never);
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ id: "submission-1" }), { status: 200 }));

    const formData = new FormData();
    formData.set("category", "technical");
    formData.set("priority", "normal");
    formData.set("subject", "Need help");
    formData.set("description", "The screen is blank after I submit.");
    formData.set("attachment", new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "screen.png", { type: "image/png" }));

    const response = await POST(new Request("http://localhost/api/support/ticket", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: formData,
    }) as never);

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      "https://formspree.io/f/xwlebndz",
      expect.objectContaining({ method: "POST", headers: { Accept: "application/json" } }),
    );
    const forwarded = vi.mocked(fetch).mock.calls[0]?.[1]?.body as FormData;
    expect(forwarded.get("email")).toBe("user@example.com");
    expect(forwarded.get("name")).toBe("User Name");
    expect(forwarded.get("message")).toBe("The screen is blank after I submit.");
    expect(forwarded.get("attachment")).toBeInstanceOf(File);
  });
});
