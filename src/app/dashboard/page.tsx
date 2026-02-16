"use client";

import { useSession } from "next-auth/react";

export default function DashboardPage() {
    const { data: session } = useSession();
    const firstName = session?.user?.name?.split(" ")[0] || "there";
    // ── Mock data ──
    const stats = [
        {
            label: "Interviews Completed",
            value: "12",
            change: "+3 this week",
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            label: "Average Score",
            value: "78",
            change: "+5 pts vs last month",
            suffix: "/100",
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
            ),
        },
        {
            label: "Hours Practiced",
            value: "8.5",
            change: "2.5h this week",
            suffix: "h",
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            label: "Current Streak",
            value: "5",
            change: "Personal best!",
            suffix: " days 🔥",
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.468 5.99 5.99 0 00-1.925 3.547 5.975 5.975 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
                </svg>
            ),
        },
    ];

    const recentSessions = [
        { id: 1, role: "Frontend Developer", company: "Google", score: 85, duration: "28 min", date: "Feb 11, 2026", status: "Completed" },
        { id: 2, role: "Product Manager", company: "Meta", score: 72, duration: "32 min", date: "Feb 10, 2026", status: "Completed" },
        { id: 3, role: "Data Scientist", company: "Netflix", score: 90, duration: "25 min", date: "Feb 9, 2026", status: "Completed" },
        { id: 4, role: "Backend Engineer", company: "Amazon", score: 68, duration: "30 min", date: "Feb 8, 2026", status: "Completed" },
        { id: 5, role: "UX Designer", company: "Apple", score: 79, duration: "22 min", date: "Feb 7, 2026", status: "Completed" },
    ];

    const chartData = [
        { label: "Feb 5", value: 62 },
        { label: "Feb 6", value: 70 },
        { label: "Feb 7", value: 79 },
        { label: "Feb 8", value: 68 },
        { label: "Feb 9", value: 90 },
        { label: "Feb 10", value: 72 },
        { label: "Feb 11", value: 85 },
    ];
    const chartMax = 100;

    return (
        <div className="space-y-8">
            {/* ── Greeting ── */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                    Welcome back, {firstName}
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                    Here&apos;s how your interview prep is going.
                </p>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((s) => (
                    <div
                        key={s.label}
                        className="rounded-2xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-500">
                                {s.label}
                            </span>
                            <span className="text-zinc-400">{s.icon}</span>
                        </div>
                        <p className="text-3xl font-bold tracking-tight text-zinc-900">
                            {s.value}
                            {s.suffix && (
                                <span className="text-lg font-medium text-zinc-400">
                                    {s.suffix}
                                </span>
                            )}
                        </p>
                        <p className="mt-1 text-xs text-emerald-600">{s.change}</p>
                    </div>
                ))}
            </div>

            {/* ── Quick Actions ── */}
            <div className="flex flex-wrap gap-3">
                <button className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-zinc-700 hover:shadow-lg">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Start New Interview
                </button>
                <button className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                    Browse Questions
                </button>
            </div>

            {/* ── Bottom Grid: Chart + Sessions ── */}
            <div className="grid gap-6 lg:grid-cols-5">
                {/* Performance Chart */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-2">
                    <h3 className="mb-1 text-sm font-semibold text-zinc-900">
                        Performance
                    </h3>
                    <p className="mb-6 text-xs text-zinc-400">Last 7 sessions</p>

                    <div className="flex items-end gap-3">
                        {chartData.map((d) => {
                            const barH = Math.round((d.value / chartMax) * 140);
                            return (
                                <div key={d.label} className="group flex flex-1 flex-col items-center gap-1.5">
                                    <span className="text-[10px] font-medium text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
                                        {d.value}
                                    </span>
                                    <div
                                        className="w-full min-h-[4px] rounded-md bg-zinc-200 transition-colors group-hover:bg-zinc-900"
                                        style={{ height: barH }}
                                    />
                                    <span className="text-[10px] text-zinc-400">
                                        {d.label.split(" ")[1]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Sessions */}
                <div className="rounded-2xl border border-zinc-200 bg-white lg:col-span-3">
                    <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
                        <h3 className="text-sm font-semibold text-zinc-900">
                            Recent Sessions
                        </h3>
                        <button className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900">
                            View all →
                        </button>
                    </div>

                    <div className="divide-y divide-zinc-100">
                        {recentSessions.map((s) => (
                            <div
                                key={s.id}
                                className="flex items-center justify-between px-6 py-3.5 transition-colors hover:bg-zinc-50"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-500">
                                        {s.company.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-900">
                                            {s.role}
                                        </p>
                                        <p className="text-xs text-zinc-400">
                                            {s.company} · {s.date}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-zinc-900">
                                            {s.score}
                                            <span className="text-xs font-normal text-zinc-400">
                                                /100
                                            </span>
                                        </p>
                                        <p className="text-[11px] text-zinc-400">{s.duration}</p>
                                    </div>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.score >= 80
                                            ? "bg-emerald-50 text-emerald-700"
                                            : s.score >= 70
                                                ? "bg-amber-50 text-amber-700"
                                                : "bg-red-50 text-red-700"
                                            }`}
                                    >
                                        {s.score >= 80 ? "Great" : s.score >= 70 ? "Good" : "Needs Work"}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
