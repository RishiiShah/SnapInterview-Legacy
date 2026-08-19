"use client";

import { useRef, useEffect, useState } from "react";
import { IconCheckCircle } from "@/components/ui/icons";

interface SearchableDropdownProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: readonly string[];
    placeholder?: string;
    isOptional?: boolean;
    allowCustomValue?: boolean;
    onRequestOption?: (value: string) => void;
    /** Dashboard pages use dark; onboarding keeps light. */
    tone?: "light" | "dark";
}

export default function SearchableDropdown({
    label,
    value,
    onChange,
    options,
    placeholder = "Search or type...",
    isOptional = false,
    allowCustomValue = true,
    onRequestOption,
    tone = "light",
}: SearchableDropdownProps) {
    const [open, setOpen] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState(-1);
    const [searchTerm, setSearchTerm] = useState(value);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const dark = tone === "dark";

    const filteredOptions = options.filter((option) =>
        option.toLowerCase().includes((allowCustomValue ? value : searchTerm).toLowerCase())
    );
    const requestQuery = searchTerm.trim();

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

    useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus();
        }
    }, [open]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open && (e.key === "ArrowDown" || e.key === " " || e.key === "Enter")) {
            e.preventDefault();
            setOpen(true);
            return;
        }

        if (!open) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setHoveredIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setHoveredIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;
            case "Enter":
                e.preventDefault();
                if (hoveredIndex >= 0 && filteredOptions[hoveredIndex]) {
                    selectOption(filteredOptions[hoveredIndex]);
                }
                break;
            case "Escape":
                e.preventDefault();
                setOpen(false);
                break;
        }
    };

    const selectOption = (option: string) => {
        onChange(option);
        setSearchTerm(option);
        setOpen(false);
        setHoveredIndex(-1);
    };

    useEffect(() => {
        if (hoveredIndex >= 0 && listRef.current) {
            const hoveredElement = listRef.current.children[hoveredIndex] as HTMLElement;
            if (hoveredElement) {
                hoveredElement.scrollIntoView({ block: "nearest" });
            }
        }
    }, [hoveredIndex]);

    return (
        <div>
            {label ? (
                <label
                    className={`mb-1.5 block text-sm font-medium ${
                        dark ? "text-[12px] text-[#A8B0C2]" : "text-zinc-700"
                    }`}
                >
                    {label}
                    {isOptional ? (
                        <span className={dark ? "text-[#6B7385]" : "text-zinc-600"}> (optional)</span>
                    ) : null}
                </label>
            ) : null}

            <div ref={containerRef} className="relative" data-practice-selector>
                <div
                    className={`w-full text-sm outline-none transition-colors ${
                        dark
                            ? "border-b border-white/[0.12] bg-transparent px-0 py-2.5 text-[#F2F4F8] focus-within:border-[#3B82F6]"
                            : "rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-zinc-900 focus-within:border-zinc-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-100"
                    }`}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={allowCustomValue || !open ? value : searchTerm}
                        onChange={(e) => {
                            if (allowCustomValue) {
                                onChange(e.target.value);
                            } else {
                                setSearchTerm(e.target.value);
                            }
                            setHoveredIndex(-1);
                            if (!open) setOpen(true);
                        }}
                        onFocus={() => {
                            if (!allowCustomValue) setSearchTerm("");
                            setOpen(true);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className={`w-full bg-transparent outline-none ${
                            dark
                                ? "text-[15px] text-[#F2F4F8] placeholder-[#6B7385]"
                                : "text-zinc-900 placeholder-zinc-400"
                        }`}
                    />
                </div>

                {open ? (
                    <div
                        ref={listRef}
                        className={`absolute top-full left-0 right-0 z-10 mt-1.5 max-h-48 overflow-y-auto rounded-xl ${
                            dark
                                ? "border border-white/[0.1] bg-[#14161E] shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
                                : "border border-zinc-200 bg-white shadow-lg"
                        }`}
                    >
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <button
                                    key={option}
                                    onClick={() => selectOption(option)}
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(-1)}
                                    className={`flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${
                                        dark
                                            ? hoveredIndex === index
                                                ? "bg-white/[0.06] text-[#F2F4F8]"
                                                : value === option
                                                  ? "bg-[#3B82F6]/15 font-medium text-[#93C5FD]"
                                                  : "text-[#C5CBD8] hover:bg-white/[0.04]"
                                            : hoveredIndex === index
                                              ? "bg-zinc-50 text-zinc-900"
                                              : value === option
                                                ? "bg-sky-50 font-semibold text-sky-700"
                                                : "text-zinc-700 hover:bg-zinc-50"
                                    }`}
                                >
                                    <span className="truncate">{option}</span>
                                    {value === option ? (
                                        <IconCheckCircle
                                            className={`h-4 w-4 shrink-0 ${
                                                dark ? "text-[#60A5FA]" : "text-sky-600"
                                            }`}
                                        />
                                    ) : null}
                                </button>
                            ))
                        ) : (
                            onRequestOption && !allowCustomValue && requestQuery ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onRequestOption(requestQuery);
                                        setOpen(false);
                                    }}
                                    className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                                        dark
                                            ? "text-[#93C5FD] hover:bg-white/[0.04]"
                                            : "text-sky-700 hover:bg-zinc-50"
                                    }`}
                                >
                                    Request {requestQuery} — use General for now
                                </button>
                            ) : (
                                <div
                                    className={`px-4 py-3 text-center text-sm ${
                                        dark ? "text-[#A8B0C2]" : "text-zinc-600"
                                    }`}
                                >
                                    No matches found
                                </div>
                            )
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
