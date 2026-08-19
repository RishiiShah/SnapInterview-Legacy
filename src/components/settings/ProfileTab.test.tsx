// @vitest-environment jsdom

import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deferred } from "@/test-utils/deferred";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import ProfileTab from "./ProfileTab";

describe("ProfileTab", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("coalesces Strict Mode's repeated initial resume load", () => {
    const response = deferred<Response>();
    const fetchMock = vi.fn().mockReturnValue(response.promise);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <StrictMode>
        <ProfileTab userName="Ada Lovelace" userEmail="ada@example.com" initials="AL" />
      </StrictMode>,
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("/api/resume");

    response.resolve(new Response(JSON.stringify({ resumeText: null }), { status: 200 }));
  });

  it("uses server-provided resume text without a client request", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ProfileTab
        userName="Ada Lovelace"
        userEmail="ada@example.com"
        initials="AL"
        initialResumeText="Built distributed systems with TypeScript."
      />,
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the saved resume after one successful upload request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ resumeText: "Built distributed systems." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ProfileTab
        userName="Ada Lovelace"
        userEmail="ada@example.com"
        initials="AL"
        initialResumeText={null}
      />,
    );

    fireEvent.change(screen.getByLabelText(/upload resume/i), {
      target: {
        files: [new File(["pdf"], "resume.pdf", { type: "application/pdf" })],
      },
    });

    expect(await screen.findByText("Resume saved")).toBeDefined();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
