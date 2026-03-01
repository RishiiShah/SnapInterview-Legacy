import { useState } from "react";
import Link from "next/link";
import { IconEyeClosed, IconEyeOpen } from "@/components/ui/icons";

interface PasswordInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    showForgotPasswordLink?: boolean;
}

export function PasswordInput({
    id,
    label,
    value,
    onChange,
    placeholder = "••••••••",
    showForgotPasswordLink = false,
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor={id} className="block text-sm font-medium text-zinc-700">
                    {label}
                </label>
                {showForgotPasswordLink && (
                    <Link
                        href="/forgot-password"
                        className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900"
                    >
                        Forgot password?
                    </Link>
                )}
            </div>
            <div className="relative">
                <input
                    id={id}
                    type={showPassword ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-11 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-colors focus:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-zinc-100"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                >
                    {showPassword ? <IconEyeClosed className="h-4.5 w-4.5" /> : <IconEyeOpen className="h-4.5 w-4.5" />}
                </button>
            </div>
        </div>
    );
}
