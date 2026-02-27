"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { FadeIn, SlideIn } from "@/components/ui/motion";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";

interface VideoRecording {
    key: string;
    url: string;
    lastModified: string;
    size: number;
}

let recordingsCache: VideoRecording[] | null = null;
let recordingsCacheAt = 0;
let recordingsInFlight: Promise<VideoRecording[]> | null = null;

const RECORDINGS_CACHE_TTL_MS = 5000;

async function fetchRecordingsOnce(): Promise<VideoRecording[]> {
    const now = Date.now();

    if (recordingsCache && now - recordingsCacheAt < RECORDINGS_CACHE_TTL_MS) {
        return recordingsCache;
    }

    if (recordingsInFlight) {
        return recordingsInFlight;
    }

    recordingsInFlight = (async () => {
        const res = await fetch("/api/s3/videos");
        if (!res.ok) {
            throw new Error(`Failed to fetch recordings: ${res.status}`);
        }

        const data = await res.json();
        const videos = data.videos || [];
        recordingsCache = videos;
        recordingsCacheAt = Date.now();
        return videos;
    })();

    try {
        return await recordingsInFlight;
    } finally {
        recordingsInFlight = null;
    }
}

export default function RecordingsPage() {
    const [recordings, setRecordings] = useState<VideoRecording[]>([]);
    const [isLoadingRecordings, setIsLoadingRecordings] = useState(true);
    const [deletingKey, setDeletingKey] = useState<string | null>(null);
    const [recordingToDelete, setRecordingToDelete] = useState<string | null>(null);

    useEffect(() => {
        const fetchRecordings = async () => {
            try {
                const videos = await fetchRecordingsOnce();
                setRecordings(videos);
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
                setRecordings((prev) => prev.filter((recording) => recording.key !== recordingToDelete));
                recordingsCache = (recordingsCache || []).filter((recording) => recording.key !== recordingToDelete);
                recordingsCacheAt = Date.now();
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

    return (
        <DashboardShell>
            <div className="space-y-8 pb-8">
                <SlideIn>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Recordings</h1>
                        <p className="mt-1 text-sm text-zinc-500">Review and manage your saved interview session videos.</p>
                    </div>
                </SlideIn>

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
                        {recordings.map((recording, idx) => {
                            const date = new Date(recording.lastModified).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            });
                            const formattedSize = `${(recording.size / (1024 * 1024)).toFixed(2)} MB`;

                            return (
                                <FadeIn key={recording.key} delay={idx * 0.08} direction="up" className="overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-shadow hover:shadow-lg">
                                    <div className="aspect-video bg-zinc-900">
                                        <video
                                            src={`${recording.url}#t=0.001`}
                                            crossOrigin="anonymous"
                                            controls
                                            preload="metadata"
                                            className="h-full w-full object-contain"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <div className="mb-1 flex items-center justify-between gap-3">
                                            <h3 className="truncate text-sm font-semibold text-zinc-900">Interview Session</h3>
                                            <button
                                                onClick={() => setRecordingToDelete(recording.key)}
                                                disabled={deletingKey === recording.key}
                                                className="flex cursor-pointer items-center justify-center rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-default disabled:opacity-50"
                                                title="Delete this recording"
                                            >
                                                {deletingKey === recording.key ? (
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                                                ) : (
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-zinc-500">
                                            <span>{date}</span>
                                            <span>{formattedSize}</span>
                                        </div>
                                    </div>
                                </FadeIn>
                            );
                        })}
                    </div>
                )}
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
