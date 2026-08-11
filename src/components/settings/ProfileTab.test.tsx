// @vitest-environment jsdom

import { StrictMode } from "react";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import ProfileTab from "./ProfileTab";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe("ProfileTab", () => {
  afterEach(() => {
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
});
