"use client";

import { useState, useRef, useEffect } from "react";

interface Option {
    label: string;
    value: string;
}

interface SelectDropdownProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Option[];
}

export default function SelectDropdown({ label, value, onChange, options }: SelectDropdownProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedLabel = options.find((o) => o.value === value)?.label || "Select...";

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [open]);

    return (
        <div ref={containerRef} className="relative">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">{label}</label>

            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors hover:border-zinc-300 hover:bg-white focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100"
            >
                <span className="truncate">{selectedLabel}</span>
                <svg className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                            className={`w-full cursor-pointer px-4 py-2.5 text-left text-sm transition-colors ${value === option.value
                                    ? "bg-zinc-100 font-medium text-zinc-900"
                                    : "text-zinc-700 hover:bg-zinc-50"
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
