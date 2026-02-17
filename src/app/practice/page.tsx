"use client";

import { useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { CATEGORIES, DIFFICULTIES } from "@/data/constants";
import type { InterviewType, Difficulty } from "@/data/types";

export default function PracticePage() {
    const [role, setRole] = useState("");
    const [company, setCompany] = useState("");
    const [type, setType] = useState<InterviewType>("behavioral");
    const [difficulty, setDifficulty] = useState<Difficulty>("medium");
    const [started, setStarted] = useState(false);

    // Mock recent practice sessions (will come from DB)
    const recentPractice = [
        { id: 1, role: "Frontend Developer", company: "Google", type: "technical" as InterviewType, score: 85, date: "Feb 11, 2026" },
        { id: 2, role: "Product Manager", company: "Meta", type: "behavioral" as InterviewType, score: 72, date: "Feb 10, 2026" },
        { id: 3, role: "Data Scientist", company: "Netflix", type: "system-design" as InterviewType, score: 90, date: "Feb 9, 2026" },
    ];

    function handleStart() {
        if (!role.trim()) return;
        setStarted(true);
        // TODO: Connect to AI interview engine
        setTimeout(() => setStarted(false), 2000);
    }

    return (
        <DashboardShell>
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Practice Interview</h1>
                    <p className="mt-1 text-sm text-zinc-500">Set up your mock interview and start practicing.</p>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* ── Interview Setup ── */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                            <h2 className="mb-6 text-lg font-semibold text-zinc-900">Interview Setup</h2>
                            <div className="space-y-5">
                                {/* Role */}
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-zinc-700">Role / Position</label>
                                    <input
                                        type="text" value={role} onChange={(e) => setRole(e.target.value)}
                                        placeholder="e.g. Frontend Developer, Product Manager"
                                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100"
                                    />
                                </div>

                                {/* Company */}
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-zinc-700">Company <span className="text-zinc-400">(optional)</span></label>
                                    <input
                                        type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                                        placeholder="e.g. Google, Meta, Amazon"
                                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100"
                                    />
                                </div>

                                {/* Interview Type */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-zinc-700">Interview Type</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CATEGORIES.map((cat) => (
                                            <button key={cat.value} onClick={() => setType(cat.value)}
                                                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${type === cat.value ? "bg-zinc-900 text-white shadow-sm" : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"}`}>
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Difficulty */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-zinc-700">Difficulty</label>
                                    <div className="flex gap-2">
                                        {DIFFICULTIES.map((d) => (
                                            <button key={d.value} onClick={() => setDifficulty(d.value)}
                                                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${difficulty === d.value ? "bg-zinc-900 text-white shadow-sm" : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"}`}>
                                                {d.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Start Button */}
                            <button onClick={handleStart} disabled={!role.trim() || started}
                                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                {started ? (
                                    <>
                                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        Preparing interview…
                                    </>
                                ) : (
                                    <>
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" /></svg>
                                        Start Interview
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* ── Recent Practice ── */}
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-zinc-200 bg-white">
                            <div className="border-b border-zinc-100 px-5 py-4">
                                <h3 className="text-sm font-semibold text-zinc-900">Recent Practice</h3>
                            </div>
                            <div className="divide-y divide-zinc-50">
                                {recentPractice.map((s) => (
                                    <div key={s.id} className="px-5 py-3.5 transition-colors hover:bg-zinc-50">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-zinc-900">{s.role}</p>
                                            <span className="text-sm font-semibold text-zinc-900">{s.score}<span className="text-xs font-normal text-zinc-400">/100</span></span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-zinc-400">{s.company} · {s.date}</p>
                                        <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${CATEGORIES.find((c) => c.value === s.type)?.color}`}>{CATEGORIES.find((c) => c.value === s.type)?.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                            <h3 className="mb-3 text-sm font-semibold text-zinc-900">💡 Pro Tips</h3>
                            <ul className="space-y-2 text-xs text-zinc-500">
                                <li className="flex gap-2"><span className="text-zinc-300">•</span>Use the STAR method for behavioral questions</li>
                                <li className="flex gap-2"><span className="text-zinc-300">•</span>Think out loud during technical interviews</li>
                                <li className="flex gap-2"><span className="text-zinc-300">•</span>Start with high-level design before diving into details</li>
                                <li className="flex gap-2"><span className="text-zinc-300">•</span>Ask clarifying questions before solving</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
