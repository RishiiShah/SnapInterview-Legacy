import { useState } from "react";
import Link from "next/link";
import { IconEyeClosed, IconEyeOpen } from "@/components/ui/icons";
import { authFieldClassName } from "./AuthShell";

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showForgotPasswordLink?: boolean;
  autoComplete?: string;
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder = "••••••••",
  showForgotPasswordLink = false,
  autoComplete = "current-password",
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#CBD5E1]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`${authFieldClassName} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#B8C0CE] transition-colors hover:text-[#CBD5E1]"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <IconEyeClosed className="h-4 w-4" />
          ) : (
            <IconEyeOpen className="h-4 w-4" />
          )}
        </button>
      </div>
      {showForgotPasswordLink ? (
        <p className="mt-2 text-center">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-[#60A5FA] transition-colors hover:text-white"
          >
            Forgot password?
          </Link>
        </p>
      ) : null}
    </div>
  );
}
