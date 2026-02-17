"use client";

import { useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { CATEGORIES, DIFFICULTIES } from "@/data/constants";
import type { InterviewType, Difficulty, Question } from "@/data/types";

// Mock questions (will come from DB)
const allQuestions: Question[] = [
    // Behavioral
    { id: 1, text: "Tell me about a time you had to deal with a difficult team member.", category: "behavioral", difficulty: "medium", estimatedTime: "5 min" },
    { id: 2, text: "Describe a situation where you failed and what you learned from it.", category: "behavioral", difficulty: "medium", estimatedTime: "5 min" },
    { id: 3, text: "How do you handle tight deadlines and pressure?", category: "behavioral", difficulty: "easy", estimatedTime: "4 min" },
    { id: 4, text: "Tell me about a time you went above and beyond for a project.", category: "behavioral", difficulty: "easy", estimatedTime: "5 min" },
    { id: 5, text: "Describe a conflict you resolved in a professional setting.", category: "behavioral", difficulty: "hard", estimatedTime: "6 min" },
    { id: 6, text: "How do you prioritize tasks when everything seems urgent?", category: "behavioral", difficulty: "medium", estimatedTime: "4 min" },
    { id: 7, text: "Tell me about a time you had to persuade someone to see your point of view.", category: "behavioral", difficulty: "hard", estimatedTime: "6 min" },
    // Technical
    { id: 8, text: "Explain the difference between REST and GraphQL APIs.", category: "technical", difficulty: "medium", estimatedTime: "5 min" },
    { id: 9, text: "How would you optimize a slow database query?", category: "technical", difficulty: "hard", estimatedTime: "8 min" },
    { id: 10, text: "What is the event loop in Node.js and how does it work?", category: "technical", difficulty: "medium", estimatedTime: "6 min" },
    { id: 11, text: "Explain closures in JavaScript with an example.", category: "technical", difficulty: "easy", estimatedTime: "4 min" },
    { id: 12, text: "How would you implement authentication in a web application?", category: "technical", difficulty: "medium", estimatedTime: "7 min" },
    { id: 13, text: "What are the trade-offs between SQL and NoSQL databases?", category: "technical", difficulty: "medium", estimatedTime: "6 min" },
    { id: 14, text: "Explain how React's virtual DOM works and why it's performant.", category: "technical", difficulty: "easy", estimatedTime: "5 min" },
    { id: 15, text: "How would you handle race conditions in concurrent systems?", category: "technical", difficulty: "hard", estimatedTime: "8 min" },
    // System Design
    { id: 16, text: "Design a URL shortener like bit.ly.", category: "system-design", difficulty: "medium", estimatedTime: "15 min" },
    { id: 17, text: "Design a real-time chat application like Slack.", category: "system-design", difficulty: "hard", estimatedTime: "20 min" },
    { id: 18, text: "Design a news feed system like Twitter.", category: "system-design", difficulty: "hard", estimatedTime: "20 min" },
    { id: 19, text: "Design a rate limiter for an API gateway.", category: "system-design", difficulty: "medium", estimatedTime: "12 min" },
    { id: 20, text: "Design a file storage system like Google Drive.", category: "system-design", difficulty: "hard", estimatedTime: "20 min" },
    { id: 21, text: "Design a notification system for a mobile app.", category: "system-design", difficulty: "medium", estimatedTime: "15 min" },
    { id: 22, text: "Design a simple key-value store.", category: "system-design", difficulty: "easy", estimatedTime: "10 min" },
    // Leadership
    { id: 23, text: "How do you measure success for your team?", category: "leadership", difficulty: "medium", estimatedTime: "5 min" },
    { id: 24, text: "Describe how you've built and scaled a high-performing engineering team.", category: "leadership", difficulty: "hard", estimatedTime: "7 min" },
    { id: 25, text: "How do you handle underperforming team members?", category: "leadership", difficulty: "hard", estimatedTime: "6 min" },
    { id: 26, text: "What's your approach to making technical decisions as a leader?", category: "leadership", difficulty: "medium", estimatedTime: "5 min" },
    { id: 27, text: "How do you foster innovation within your team?", category: "leadership", difficulty: "easy", estimatedTime: "5 min" },
    { id: 28, text: "Describe a time you had to make a difficult trade-off between speed and quality.", category: "leadership", difficulty: "medium", estimatedTime: "6 min" },
];

export default function QuestionsPage() {
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<InterviewType | "all">("all");
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | "all">("all");

    const filtered = allQuestions.filter((q) => {
        if (selectedCategory !== "all" && q.category !== selectedCategory) return false;
        if (selectedDifficulty !== "all" && q.difficulty !== selectedDifficulty) return false;
        if (search && !q.text.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const categoryColor = (cat: InterviewType) => CATEGORIES.find((c) => c.value === cat)?.color || "";
    const difficultyColor = (d: Difficulty) => DIFFICULTIES.find((x) => x.value === d)?.color || "";

    return (
        <DashboardShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Question Bank</h1>
                    <p className="mt-1 text-sm text-zinc-500">{allQuestions.length} questions across {CATEGORIES.length} categories</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[240px]">
                        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions…"
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100" />
                    </div>

                    {/* Category Filter */}
                    <div className="flex gap-1.5">
                        <button onClick={() => setSelectedCategory("all")} className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${selectedCategory === "all" ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>All</button>
                        {CATEGORIES.map((cat) => (
                            <button key={cat.value} onClick={() => setSelectedCategory(cat.value)} className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${selectedCategory === cat.value ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>{cat.label}</button>
                        ))}
                    </div>

                    {/* Difficulty Filter */}
                    <div className="flex gap-1.5">
                        <button onClick={() => setSelectedDifficulty("all")} className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${selectedDifficulty === "all" ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>All</button>
                        {DIFFICULTIES.map((d) => (
                            <button key={d.value} onClick={() => setSelectedDifficulty(d.value)} className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${selectedDifficulty === d.value ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>{d.label}</button>
                        ))}
                    </div>
                </div>

                {/* Results count */}
                <p className="text-xs text-zinc-400">{filtered.length} question{filtered.length !== 1 ? "s" : ""} found</p>

                {/* Question Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((q) => (
                        <div key={q.id} className="group rounded-2xl border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 hover:shadow-md">
                            <div className="mb-3 flex items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColor(q.category)}`}>{CATEGORIES.find((c) => c.value === q.category)?.label}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${difficultyColor(q.difficulty)}`}>{DIFFICULTIES.find((d) => d.value === q.difficulty)?.label}</span>
                            </div>
                            <p className="text-sm font-medium text-zinc-900 leading-relaxed">{q.text}</p>
                            <div className="mt-4 flex items-center justify-between">
                                <span className="flex items-center gap-1 text-xs text-zinc-400">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {q.estimatedTime}
                                </span>
                                <button className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-all group-hover:opacity-100 hover:bg-zinc-700">Practice</button>
                            </div>
                        </div>
                    ))}
                </div>

                {filtered.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-zinc-200 py-16 text-center">
                        <p className="text-sm text-zinc-400">No questions match your filters.</p>
                        <button onClick={() => { setSearch(""); setSelectedCategory("all"); setSelectedDifficulty("all"); }} className="mt-2 text-sm font-medium text-zinc-600 hover:text-zinc-900">Clear filters</button>
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
