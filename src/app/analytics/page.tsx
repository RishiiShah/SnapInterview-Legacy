"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import { CATEGORIES } from "@/data/constants";
import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";
import { useEffect, useState } from "react";

interface VideoRecording {
    key: string;
    url: string;
    lastModified: string;
    size: number;
}

export default function AnalyticsPage() {
    const [recordings, setRecordings] = useState<VideoRecording[]>([]);
    const [isLoadingRecordings, setIsLoadingRecordings] = useState(true);
    const [deletingKey, setDeletingKey] = useState<string | null>(null);
    const [recordingToDelete, setRecordingToDelete] = useState<string | null>(null);

    useEffect(() => {
        const fetchRecordings = async () => {
            try {
                const res = await fetch("/api/s3/videos");
                if (res.ok) {
                    const data = await res.json();
                    setRecordings(data.videos || []);
                }
            } catch (error) {
                console.error("Failed to fetch recordings:", error);
            } finally {
                setIsLoadingRecordings(false);
            }
        };

        fetchRecordings();
    }, []);

    const handleDeleteRecording = async () => {
        if (!recordingToDelete) return;

        setDeletingKey(recordingToDelete);
        try {
            const res = await fetch("/api/s3/videos", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: recordingToDelete }),
            });
            if (res.ok) {
                setRecordings(prev => prev.filter(r => r.key !== recordingToDelete));
                setRecordingToDelete(null);
            } else {
                alert("Failed to delete recording.");
            }
        } catch (error) {
            console.error("Error deleting recording:", error);
            alert("Error deleting recording.");
        } finally {
            setDeletingKey(null);
        }
    };

    // Mock analytics data (will come from DB)
    const weeklyScores = [
        { label: "Mon", value: 72 }, { label: "Tue", value: 85 }, { label: "Wed", value: 68 },
        { label: "Thu", value: 90 }, { label: "Fri", value: 78 }, { label: "Sat", value: 82 },
        { label: "Sun", value: 88 },
    ];

    const monthlyComparison = [
        { label: "This Month", interviews: 12, avgScore: 82, hours: 8.5 },
        { label: "Last Month", interviews: 9, avgScore: 74, hours: 6.2 },
    ];

    const categoryBreakdown = [
        { category: "Behavioral", score: 85, total: 100, color: "bg-blue-500", lightColor: "bg-blue-100" },
        { category: "Technical", score: 72, total: 100, color: "bg-purple-500", lightColor: "bg-purple-100" },
        { category: "System Design", score: 68, total: 100, color: "bg-amber-500", lightColor: "bg-amber-100" },
        { category: "Leadership", score: 90, total: 100, color: "bg-emerald-500", lightColor: "bg-emerald-100" },
    ];

    const strengths = [
        { skill: "Communication clarity", score: 92 },
        { skill: "STAR method structure", score: 88 },
        { skill: "Leadership examples", score: 85 },
    ];
    const weaknesses = [
        { skill: "System scalability", score: 62 },
        { skill: "Time complexity analysis", score: 65 },
        { skill: "Edge case handling", score: 68 },
    ];

    return (
        <DashboardShell>
            <div className="space-y-8">
                <SlideIn>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Analytics</h1>
                        <p className="mt-1 text-sm text-zinc-500">Track your progress and identify areas for improvement.</p>
                    </div>
                </SlideIn>

                {/* Monthly Comparison */}
                <FadeInStagger className="grid gap-4 sm:grid-cols-3">
                    {[
                        { label: "Interviews", current: monthlyComparison[0].interviews, prev: monthlyComparison[1].interviews, suffix: "" },
                        { label: "Avg Score", current: monthlyComparison[0].avgScore, prev: monthlyComparison[1].avgScore, suffix: "/100" },
                        { label: "Hours Practiced", current: monthlyComparison[0].hours, prev: monthlyComparison[1].hours, suffix: "h" },
                    ].map((stat) => {
                        const diff = stat.current - stat.prev;
                        const pct = stat.prev > 0 ? Math.round((diff / stat.prev) * 100) : 0;
                        return (
                            <FadeInStaggerItem key={stat.label} className="rounded-2xl border border-zinc-200 bg-white p-5">
                                <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
                                <p className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">
                                    {stat.current}<span className="text-lg font-medium text-zinc-400">{stat.suffix}</span>
                                </p>
                                <p className={`mt-1 text-xs font-medium ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                    {diff >= 0 ? "↑" : "↓"} {Math.abs(pct)}% vs last month
                                </p>
                            </FadeInStaggerItem>
                        );
                    })}
                </FadeInStagger>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Weekly Score Chart */}
                    <FadeIn delay={0.2} direction="up" className="rounded-2xl border border-zinc-200 bg-white p-6">
                        <h3 className="mb-1 text-sm font-semibold text-zinc-900">Weekly Performance</h3>
                        <p className="mb-6 text-xs text-zinc-400">Score trend this week</p>
                        <div className="flex items-end gap-4">
                            {weeklyScores.map((d) => {
                                const barH = Math.round((d.value / 100) * 160);
                                return (
                                    <div key={d.label} className="group flex flex-1 flex-col items-center gap-2">
                                        <span className="text-[10px] font-medium text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">{d.value}</span>
                                        <div className="w-full min-h-[4px] rounded-md bg-zinc-200 transition-colors group-hover:bg-zinc-900" style={{ height: barH }} />
                                        <span className="text-[10px] font-medium text-zinc-400">{d.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </FadeIn>

                    {/* Category Breakdown */}
                    <FadeIn delay={0.3} direction="up" className="rounded-2xl border border-zinc-200 bg-white p-6">
                        <h3 className="mb-1 text-sm font-semibold text-zinc-900">Category Breakdown</h3>
                        <p className="mb-6 text-xs text-zinc-400">Average score by category</p>
                        <div className="space-y-5">
                            {categoryBreakdown.map((cat) => (
                                <div key={cat.category}>
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <span className="text-sm font-medium text-zinc-700">{cat.category}</span>
                                        <span className="text-sm font-semibold text-zinc-900">{cat.score}%</span>
                                    </div>
                                    <div className={`h-2 w-full rounded-full ${cat.lightColor}`}>
                                        <div className={`h-full rounded-full ${cat.color} transition-all duration-500`} style={{ width: `${cat.score}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </FadeIn>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid gap-6 lg:grid-cols-2 pb-8">
                    <FadeIn delay={0.4} direction="up" className="rounded-2xl border border-zinc-200 bg-white p-6">
                        <h3 className="mb-4 text-sm font-semibold text-zinc-900">
                            Strengths
                        </h3>
                        <div className="space-y-3">
                            {strengths.map((s) => (
                                <div key={s.skill} className="flex items-center justify-between rounded-lg bg-emerald-50/50 px-4 py-3">
                                    <span className="text-sm font-medium text-zinc-700">{s.skill}</span>
                                    <span className="text-sm font-semibold text-emerald-700">{s.score}%</span>
                                </div>
                            ))}
                        </div>
                    </FadeIn>

                    <FadeIn delay={0.5} direction="up" className="rounded-2xl border border-zinc-200 bg-white p-6">
                        <h3 className="mb-4 text-sm font-semibold text-zinc-900">
                            Areas to Improve
                        </h3>
                        <div className="space-y-3">
                            {weaknesses.map((w) => (
                                <div key={w.skill} className="flex items-center justify-between rounded-lg bg-amber-50/50 px-4 py-3">
                                    <span className="text-sm font-medium text-zinc-700">{w.skill}</span>
                                    <span className="text-sm font-semibold text-amber-700">{w.score}%</span>
                                </div>
                            ))}
                        </div>
                    </FadeIn>
                </div>

                {/* Recordings Section */}
                <div className="pt-8 mb-8 border-t border-zinc-200">
                    <SlideIn delay={0.6}>
                        <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-6">Your Recordings</h2>

                        {isLoadingRecordings ? (
                            <div className="flex justify-center py-12">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
                            </div>
                        ) : recordings.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 py-12 text-center text-sm text-zinc-500">
                                No recordings found. Complete an interview to save your session.
                            </div>
                        ) : (
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {recordings.map((rec, idx) => {
                                    const date = new Date(rec.lastModified).toLocaleDateString(undefined, {
                                        year: 'numeric', month: 'short', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                    });
                                    const formattedSize = (rec.size / (1024 * 1024)).toFixed(2) + " MB";

                                    return (
                                        <FadeIn key={rec.key} delay={0.6 + (idx * 0.1)} direction="up" className="overflow-hidden rounded-2xl border border-zinc-200 bg-white hover:shadow-lg transition-shadow">
                                            <div className="aspect-video bg-zinc-900">
                                                <video
                                                    src={`${rec.url}#t=0.001`}
                                                    crossOrigin="anonymous"
                                                    controls
                                                    preload="metadata"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                            <div className="p-4 flex flex-col gap-3">
                                                <div>
                                                    <h3 className="text-sm font-semibold text-zinc-900 truncate">
                                                        Interview Session
                                                    </h3>
                                                    <div className="mt-1 flex items-center gap-3">
                                                        <div className="flex-1 flex items-center justify-between text-xs text-zinc-500">
                                                            <span>{date}</span>
                                                            <span>{formattedSize}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => setRecordingToDelete(rec.key)}
                                                            disabled={deletingKey === rec.key}
                                                            className="flex cursor-pointer items-center justify-center rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-default"
                                                            title="Delete this recording"
                                                        >
                                                            {deletingKey === rec.key ? (
                                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                                                            ) : (
                                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </FadeIn>
                                    );
                                })}
                            </div>
                        )}
                    </SlideIn>
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={recordingToDelete !== null}
                onClose={() => setRecordingToDelete(null)}
                onConfirm={handleDeleteRecording}
                isDeleting={deletingKey !== null}
            />
        </DashboardShell>
    );
}
