"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

export type OtpCodeInputHandle = {
  focusFirst: () => void;
};

export type OtpCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  invalid?: boolean;
  disabled?: boolean;
  ariaLabelPrefix?: string;
};

export const OtpCodeInput = forwardRef<OtpCodeInputHandle, OtpCodeInputProps>(
  function OtpCodeInput(
    {
      value,
      onChange,
      onComplete,
      length = 6,
      invalid = false,
      disabled = false,
      ariaLabelPrefix = "Digit",
    },
    ref,
  ) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const lastCompletedValueRef = useRef<string | null>(null);
    const digits = Array.from({ length }, (_, index) => value[index] ?? "");

    useEffect(() => {
      if (value.length < length) {
        lastCompletedValueRef.current = null;
      }
    }, [length, value]);

    useImperativeHandle(ref, () => ({
      focusFirst: () => inputRefs.current[0]?.focus(),
    }), []);

    const updateValue = (completeValue: string) => {
      onChange(completeValue);
      if (
        completeValue.length === length &&
        lastCompletedValueRef.current !== completeValue
      ) {
        lastCompletedValueRef.current = completeValue;
        onComplete?.(completeValue);
      }
    };

    const handleChange = (index: number, nextDigit: string) => {
      if (disabled) return;
      if (nextDigit && !/^\d$/.test(nextDigit)) return;

      updateValue(`${value.slice(0, index)}${nextDigit}`.slice(0, length));

      if (nextDigit && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    };

    const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      if (event.key === "Backspace" && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    };

    const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.preventDefault();
      const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      if (!pasted) return;

      const nextDigits = [...digits];
      for (let index = 0; index < pasted.length; index += 1) {
        nextDigits[index] = pasted[index];
      }
      updateValue(nextDigits.join("").slice(0, length));

      const nextEmpty = nextDigits.findIndex((digit) => !digit);
      inputRefs.current[nextEmpty === -1 ? length - 1 : nextEmpty]?.focus();
    };

    return (
      <div className="flex justify-start gap-2" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            disabled={disabled}
            aria-invalid={invalid}
            aria-label={`${ariaLabelPrefix} ${index + 1}`}
            className={`h-12 w-10 rounded-xl border bg-[#0C0F1A]/80 text-center text-lg font-semibold text-white outline-none transition-colors sm:w-11 ${
              invalid
                ? "border-red-500/50"
                : digit
                  ? "border-blue-500/50"
                  : "border-white/[0.1]"
            } focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15`}
          />
        ))}
      </div>
    );
  },
);
