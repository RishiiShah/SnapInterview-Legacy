"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import SearchableDropdown from "@/components/SearchableDropdown";
import { CATEGORIES, DIFFICULTIES, ROLES, COMPANIES } from "@/data/constants";
import type { InterviewType, Difficulty } from "@/data/types";

// Generate a UUID v4
function generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export default function PracticePage() {
    const router = useRouter();
    const [role, setRole] = useState("");
    const [company, setCompany] = useState("");
    const [type, setType] = useState<InterviewType>("behavioral");
    const [difficulty, setDifficulty] = useState<Difficulty>("medium");
    const [jobDescription, setJobDescription] = useState("");
    const [resumeName, setResumeName] = useState("");
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

        // Generate interview UUID and redirect
        const interviewId = generateUUID();

        // Redirect to interview page with UUID
        setTimeout(() => {
            router.push(`/interview/${interviewId}`);
        }, 500);
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
                                <SearchableDropdown
                                    label="Role / Position"
                                    value={role}
                                    onChange={setRole}
                                    options={ROLES}
                                    placeholder="Search or type role (e.g. Frontend Developer)"
                                />

                                {/* Company */}
                                <SearchableDropdown
                                    label="Company"
                                    value={company}
                                    onChange={setCompany}
                                    options={COMPANIES}
                                    placeholder="Search or type company (e.g. Google)"
                                    isOptional
                                />

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

                                {/* Job Description (Optional) */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-zinc-700">
                                        Job Description <span className="text-zinc-400 font-normal">(Optional)</span>
                                    </label>
                                    <textarea
                                        value={jobDescription}
                                        onChange={(e) => setJobDescription(e.target.value)}
                                        placeholder="Paste the job description here to tailor the interview..."
                                        className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-100 min-h-[100px] resize-y"
                                    />
                                </div>

                                {/* Resume Upload (Optional) */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-zinc-700">
                                        Resume <span className="text-zinc-400 font-normal">(Optional)</span>
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                            </svg>
                                            {resumeName ? "Change File" : "Upload PDF"}
                                            <input
                                                type="file"
                                                accept=".pdf,.doc,.docx"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) setResumeName(file.name);
                                                }}
                                            />
                                        </label>
                                        {resumeName && (
                                            <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700">
                                                <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="truncate max-w-[200px]">{resumeName}</span>
                                                <button onClick={() => setResumeName("")} className="ml-1 text-zinc-400 hover:text-red-500" title="Remove file">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
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
