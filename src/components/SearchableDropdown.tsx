"use client";

import { useRef, useEffect, useState } from "react";
import { IconCheckCircle } from "@/components/ui/icons";

interface SearchableDropdownProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    isOptional?: boolean;
}

export default function SearchableDropdown({
    label,
    value,
    onChange,
    options,
    placeholder = "Search or type...",
    isOptional = false,
}: SearchableDropdownProps) {
    const [open, setOpen] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    // Filter options based on value
    const filteredOptions = options.filter((option) =>
        option.toLowerCase().includes(value.toLowerCase())
    );

    // Close dropdown when clicking outside
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

    // Focus input when dropdown opens
    useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus();
        }
    }, [open]);

    // Handle keyboard input
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
        setOpen(false);
        setHoveredIndex(-1);
    };

    // Auto-scroll to hovered item
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
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                {label}
                {isOptional && <span className="text-zinc-400"> (optional)</span>}
            </label>

            <div ref={containerRef} className="relative">
                <div className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus-within:border-zinc-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-100">
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => {
                            onChange(e.target.value);
                            setHoveredIndex(-1);
                            if (!open) setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="w-full bg-transparent outline-none placeholder-zinc-400 text-zinc-900"
                    />
                </div>

                {/* Dropdown options */}
                {open && (
                    <div
                        ref={listRef}
                        className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg"
                    >
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <button
                                    key={option}
                                    onClick={() => selectOption(option)}
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(-1)}
                                    className={`flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                                        hoveredIndex === index
                                            ? "bg-zinc-50 text-zinc-900"
                                            : value === option
                                            ? "bg-sky-50 text-sky-700 font-semibold"
                                            : "text-zinc-700 hover:bg-zinc-50"
                                    }`}
                                >
                                    <span className="truncate">{option}</span>
                                    {value === option && (
                                        <IconCheckCircle className="h-4 w-4 shrink-0 text-sky-600" />
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-center text-sm text-zinc-400">No matches found</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
