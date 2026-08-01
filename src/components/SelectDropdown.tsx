"use client";

import { useState, useRef, useEffect } from "react";
import { IconCheckCircle } from "@/components/ui/icons";

interface Option {
    label: string;
    value: string;
    description?: string;
}

interface SelectDropdownProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    /** Dashboard pages use dark; onboarding keeps light. */
    tone?: "light" | "dark";
    disabled?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function SelectDropdown({
    label,
    value,
    onChange,
    options,
    tone = "light",
    disabled = false,
    onOpenChange,
}: SelectDropdownProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dark = tone === "dark";

    const selected = options.find((o) => o.value === value);
    const selectedLabel = selected?.label || "Select...";

    function setOpenState(next: boolean) {
        setOpen(next);
        onOpenChange?.(next);
    }

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
                onOpenChange?.(false);
            }
        }
        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [open, onOpenChange]);

    return (
        <div ref={containerRef} className="relative" data-practice-selector>
            {label ? (
                <label
                    className={`mb-1.5 block font-medium ${
                        dark ? "text-[12px] text-[#A8B0C2]" : "text-sm text-zinc-700"
                    }`}
                >
                    {label}
                </label>
            ) : null}

            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpenState(!open)}
                aria-expanded={open}
                className={`flex w-full cursor-pointer items-center justify-between text-left outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    dark
                        ? "border-b border-white/[0.12] bg-transparent px-0 py-2.5 text-[15px] text-[#F2F4F8] hover:border-white/[0.2] focus:border-[#3B82F6]"
                        : "rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 hover:border-zinc-300 hover:bg-white focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100"
                }`}
            >
                <span className="truncate">{selectedLabel}</span>
                <svg
                    className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""} ${
                        dark ? "text-[#A8B0C2]" : "text-zinc-600"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open ? (
                <div
                    className={`absolute top-full left-0 right-0 z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl ${
                        dark
                            ? "border border-white/[0.1] bg-[#14161E] shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
                            : "border border-zinc-200 bg-white shadow-lg"
                    }`}
                >
                    {options.map((option) => {
                        const isSelected = value === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setOpenState(false);
                                }}
                                className={`flex w-full cursor-pointer items-start justify-between gap-3 px-3.5 py-2.5 text-left transition-colors ${
                                    dark
                                        ? isSelected
                                            ? "bg-[#3B82F6]/15"
                                            : "hover:bg-white/[0.05]"
                                        : isSelected
                                          ? "bg-sky-50"
                                          : "hover:bg-zinc-50"
                                }`}
                            >
                                <span className="min-w-0">
                                    <span
                                        className={`block text-sm ${
                                            dark
                                                ? isSelected
                                                    ? "font-medium text-[#93C5FD]"
                                                    : "text-[#E8ECF4]"
                                                : isSelected
                                                  ? "font-semibold text-sky-700"
                                                  : "text-zinc-700"
                                        }`}
                                    >
                                        {option.label}
                                    </span>
                                    {option.description ? (
                                        <span
                                            className={`mt-0.5 block text-[12px] leading-snug ${
                                                dark ? "text-[#8B93A7]" : "text-zinc-500"
                                            }`}
                                        >
                                            {option.description}
                                        </span>
                                    ) : null}
                                </span>
                                {isSelected ? (
                                    <IconCheckCircle
                                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                                            dark ? "text-[#60A5FA]" : "text-sky-600"
                                        }`}
                                    />
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
