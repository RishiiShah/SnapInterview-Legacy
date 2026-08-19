// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OtpDialog from "./OtpDialog";

function mockOtpResponse(status = 200, body: Record<string, unknown> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("OtpDialog", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("submits pasted digits automatically and prevents duplicate verification while loading", async () => {
    const onVerified = vi.fn();
    let resolveFetch: (response: Response) => void = () => {};
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    }));
    vi.mocked(fetch).mockImplementation(fetchMock);

    render(
      <OtpDialog
        email="user@example.com"
        onVerified={onVerified}
        onCancel={vi.fn()}
        onResend={vi.fn()}
      />,
    );

    fireEvent.paste(screen.getByLabelText("Digit 1"), {
      clipboardData: {
        getData: () => "12a34-56",
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/verify-otp", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", otp: "123456" }),
    }));

    fireEvent.paste(screen.getByLabelText("Digit 1"), {
      clipboardData: {
        getData: () => "654321",
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch(mockOtpResponse());
    });

    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
  });

  it("resets entered digits and focuses the first input after failed verification", async () => {
    vi.mocked(fetch).mockResolvedValue(mockOtpResponse(400, { error: "Invalid code." }));

    render(
      <OtpDialog
        email="user@example.com"
        onVerified={vi.fn()}
        onCancel={vi.fn()}
        onResend={vi.fn()}
      />,
    );

    fireEvent.paste(screen.getByLabelText("Digit 1"), {
      clipboardData: {
        getData: () => "123456",
      },
    });

    await screen.findByText("Invalid code.");

    const firstDigit = screen.getByLabelText("Digit 1") as HTMLInputElement;
    expect(firstDigit.value).toBe("");
    expect(document.activeElement).toBe(firstDigit);
  });

  it("resets entered digits and restores focus after a verification network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));

    render(
      <OtpDialog
        email="user@example.com"
        onVerified={vi.fn()}
        onCancel={vi.fn()}
        onResend={vi.fn()}
      />,
    );

    fireEvent.paste(screen.getByLabelText("Digit 1"), {
      clipboardData: { getData: () => "123456" },
    });

    await screen.findByText("Something went wrong. Please try again.");

    const firstDigit = screen.getByLabelText("Digit 1") as HTMLInputElement;
    expect(firstDigit.value).toBe("");
    expect(document.activeElement).toBe(firstDigit);
  });

  it("enables resend after cooldown and resets the inputs after resending", async () => {
    vi.useFakeTimers();
    const onResend = vi.fn().mockResolvedValue(undefined);

    render(
      <OtpDialog
        email="user@example.com"
        onVerified={vi.fn()}
        onCancel={vi.fn()}
        onResend={onResend}
      />,
    );

    fireEvent.change(screen.getByLabelText("Digit 1"), { target: { value: "1" } });

    act(() => {
      for (let i = 0; i < 30; i += 1) {
        vi.advanceTimersByTime(1000);
      }
    });

    const resendButton = screen.getByRole("button", { name: /resend code/i });
    fireEvent.click(resendButton);

    await act(async () => {});

    expect(onResend).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText("Digit 1") as HTMLInputElement).value).toBe("");
    expect(document.body.textContent).toContain("Resend code in 30s");
  });
});
