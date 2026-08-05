"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { SEARCH_ITEMS } from "@/data/constants";
import { IconArrowRight, IconSearch } from "@/components/ui/icons";
import type { SearchResults } from "@/app/api/search/route";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function categoryLabel(type: string): string {
  const map: Record<string, string> = {
    behavioral: "Behavioral",
    technical: "Technical",
    "system-design": "System Design",
    leadership: "Leadership",
    coding: "Coding",
  };
  return map[type] ?? type;
}

export function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query.trim(), 300);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = (await res.json()) as SearchResults;
        setResults(data);
      }
    } catch {
      // silently fail — nav items still work
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchResults(debouncedQuery);
  }, [debouncedQuery, fetchResults]);

  const filteredNav = SEARCH_ITEMS.filter((i) =>
    i.label.toLowerCase().includes(query.toLowerCase()),
  );
  const navGrouped = filteredNav.reduce<Record<string, typeof SEARCH_ITEMS>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const hasDynamicResults =
    results && (results.sessions.length > 0 || results.questions.length > 0);
  const hasNavResults = filteredNav.length > 0;
  const isEmpty = !loading && !hasNavResults && !hasDynamicResults;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-[#090A0F]/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0C0F1A] shadow-2xl"
        style={{ animation: "fadeSlideIn 0.15s ease-out" }}
      >
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
          <IconSearch className="h-5 w-5 shrink-0 text-[#B4C0D0]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search interviews, questions, pages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#B8C0CE] outline-none"
          />
          {loading ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-blue-400" />
          ) : (
            <kbd className="rounded border border-white/[0.08] bg-[#070910] px-1.5 py-0.5 text-[10px] font-medium text-[#B8C0CE]">
              ESC
            </kbd>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {isEmpty ? (
            <p className="px-3 py-6 text-center text-sm text-[#B8C0CE]">No results found</p>
          ) : (
            <>
              {results && results.sessions.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#B8C0CE]">
                    Past Interviews
                  </p>
                  {results.sessions.map((s) => (
                    <Link
                      key={s.id}
                      href={`/recordings?interviewId=${s.id}`}
                      onClick={onClose}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#CBD5E1] transition-colors hover:bg-white/[0.06]"
                    >
                      <IconArrowRight className="h-4 w-4 shrink-0 text-[#B4C0D0]" />
                      <span className="flex-1 truncate">
                        {s.role}
                        {s.company ? ` · ${s.company}` : ""}
                      </span>
                      <span className="shrink-0 text-xs text-[#B8C0CE]">
                        {categoryLabel(s.type)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {results && results.questions.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#B8C0CE]">
                    Practice Questions
                  </p>
                  {results.questions.map((q) => (
                    <Link
                      key={q.id}
                      href={
                        q.type === "coding"
                          ? `/coding/${q.slug}`
                          : `/questions/${q.slug}`
                      }
                      onClick={onClose}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#CBD5E1] transition-colors hover:bg-white/[0.06]"
                    >
                      <IconArrowRight className="h-4 w-4 shrink-0 text-[#B4C0D0]" />
                      <span className="flex-1 truncate">{q.text}</span>
                      <span className="shrink-0 text-xs text-[#B8C0CE]">{q.difficulty}</span>
                    </Link>
                  ))}
                </div>
              )}

              {Object.entries(navGrouped).map(([cat, items]) => (
                <div key={cat}>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#B8C0CE]">
                    {cat}
                  </p>
                  {items.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={onClose}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#CBD5E1] transition-colors hover:bg-white/[0.06]"
                    >
                      <IconArrowRight className="h-4 w-4 text-[#B4C0D0]" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
