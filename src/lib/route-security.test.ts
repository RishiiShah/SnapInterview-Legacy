import { describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { withCsrfProtection } from "./route-security";
import { csrfRejectIfInvalid } from "./csrf";

vi.mock("./csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

describe("withCsrfProtection", () => {
  it("short-circuits before the wrapped handler when CSRF validation fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrapped = withCsrfProtection(handler);

    const response = await wrapped(new Request("http://localhost/api/test", { method: "POST" }));

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("invokes the wrapped handler when CSRF validation passes", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);

    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrapped = withCsrfProtection(handler);

    const response = await wrapped(new Request("http://localhost/api/test", { method: "POST" }));

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });
});
