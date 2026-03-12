"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { SEARCH_ITEMS } from "@/data/constants";
import { IconArrowRight, IconSearch } from "@/components/ui/icons";

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    if (!open) return null;

    const filtered = SEARCH_ITEMS.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()));
    const grouped = filtered.reduce<Record<string, typeof SEARCH_ITEMS>>((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
            <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-2xl" style={{ animation: "fadeSlideIn 0.15s ease-out" }}>
                <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
                    <IconSearch className="h-5 w-5 shrink-0 text-zinc-400" />
                    <input ref={inputRef} type="text" placeholder="Search pages and actions…" value={query} onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none" />
                    <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">ESC</kbd>
                </div>
                <div className="max-h-72 overflow-y-auto p-2">
                    {Object.keys(grouped).length === 0 ? (
                        <p className="px-3 py-6 text-center text-sm text-zinc-400">No results found</p>
                    ) : (
                        Object.entries(grouped).map(([cat, items]) => (
                            <div key={cat}>
                                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{cat}</p>
                                {items.map((item) => (
                                    <Link key={item.label} href={item.href} onClick={onClose}
                                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100">
                                        <IconArrowRight className="h-4 w-4 text-zinc-400" />
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
