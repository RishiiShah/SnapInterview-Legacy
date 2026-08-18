// @vitest-environment jsdom

import { createRef, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OtpCodeInput,
  type OtpCodeInputHandle,
} from "./OtpCodeInput";

function Harness({
  initialValue = "",
  onChange = () => {},
  onComplete,
}: {
  initialValue?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <OtpCodeInput
      value={value}
      onChange={(nextValue) => {
        onChange(nextValue);
        setValue(nextValue);
      }}
      onComplete={onComplete}
    />
  );
}

describe("OtpCodeInput", () => {
  afterEach(cleanup);

  it("filters and truncates pasted text in one update and reports completion once", () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    render(<Harness onChange={onChange} onComplete={onComplete} />);

    fireEvent.paste(screen.getByLabelText("Digit 1"), {
      clipboardData: { getData: () => "12a34-56-789" },
    });

    const code = Array.from({ length: 6 }, (_, index) =>
      (screen.getByLabelText(`Digit ${index + 1}`) as HTMLInputElement).value,
    ).join("");
    expect(code).toBe("123456");
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("123456");
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("does not report the same completed value more than once", () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    const first = screen.getByLabelText("Digit 1");

    fireEvent.paste(first, {
      clipboardData: { getData: () => "123456" },
    });
    fireEvent.paste(first, {
      clipboardData: { getData: () => "123456" },
    });

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("accepts numeric entry, advances focus, and moves backward from an empty input", () => {
    render(<Harness />);

    const first = screen.getByLabelText("Digit 1") as HTMLInputElement;
    const second = screen.getByLabelText("Digit 2") as HTMLInputElement;

    fireEvent.change(first, { target: { value: "x" } });
    expect(first.value).toBe("");

    fireEvent.change(first, { target: { value: "1" } });
    expect(first.value).toBe("1");
    expect(document.activeElement).toBe(second);

    fireEvent.keyDown(second, { key: "Backspace" });
    expect(document.activeElement).toBe(first);
  });

  it("truncates at a cleared middle digit without shifting the suffix", () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    render(
      <Harness
        initialValue="123456"
        onChange={onChange}
        onComplete={onComplete}
      />,
    );

    fireEvent.change(screen.getByLabelText("Digit 3"), {
      target: { value: "" },
    });

    expect(onChange).toHaveBeenLastCalledWith("12");
    expect((screen.getByLabelText("Digit 3") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Digit 4") as HTMLInputElement).value).toBe("");
    expect(onComplete).not.toHaveBeenCalled();

    for (const [digit, value] of [[3, "9"], [4, "4"], [5, "5"], [6, "6"]] as const) {
      fireEvent.change(screen.getByLabelText(`Digit ${digit}`), {
        target: { value },
      });
    }

    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith("129456");
  });

  it("exposes invalid and disabled state with customizable accessible labels", () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    render(
      <OtpCodeInput
        value="1"
        onChange={onChange}
        onComplete={onComplete}
        invalid
        disabled
        ariaLabelPrefix="Verification digit"
      />,
    );

    const first = screen.getByLabelText("Verification digit 1") as HTMLInputElement;
    expect(first.disabled).toBe(true);
    expect(first.getAttribute("aria-invalid")).toBe("true");

    fireEvent.paste(first, {
      clipboardData: { getData: () => "123456" },
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("focuses the first input through its imperative handle", () => {
    const ref = createRef<OtpCodeInputHandle>();
    render(<OtpCodeInput ref={ref} value="" onChange={vi.fn()} />);
    (screen.getByLabelText("Digit 4") as HTMLInputElement).focus();

    act(() => ref.current?.focusFirst());

    expect(document.activeElement).toBe(screen.getByLabelText("Digit 1"));
  });
});
