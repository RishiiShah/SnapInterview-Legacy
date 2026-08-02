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
  error?: string;
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder = "••••••••",
  showForgotPasswordLink = false,
  autoComplete = "off",
  error,
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
          className={`${authFieldClassName} pr-11 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${
            error ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20" : ""
          }`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center text-[#B8C0CE] transition-colors hover:text-[#E8ECF4]"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <IconEyeClosed className="h-4 w-4" />
          ) : (
            <IconEyeOpen className="h-4 w-4" />
          )}
        </button>
      </div>
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-400">{error}</p>
      ) : null}
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
