"use client";

import { useState } from "react";
import { FadeIn } from "@/components/ui/motion";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";
import RecordingModal from "./RecordingModal";
import type { VideoRecording } from "@/lib/s3/videos";
import { extractInterviewIdFromVideoKey } from "@/lib/interview/recordings";

const recordingDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

function formatRecordingDate(value: string | Date) {
  return recordingDateFormatter.format(new Date(value));
}

type RecordingsListProps = {
  initialVideos: VideoRecording[];
};

export default function RecordingsList({ initialVideos }: RecordingsListProps) {
  const [recordings, setRecordings] = useState<VideoRecording[]>(initialVideos);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [recordingToDelete, setRecordingToDelete] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; interviewId: string; date: string } | null>(null);

  const openRecording = (recording: VideoRecording, date: string) => {
    const interviewId = extractInterviewIdFromVideoKey(recording.key);
    if (!interviewId) return;
    setSelectedVideo({ url: recording.url, interviewId, date });
  };

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

  if (recordings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 py-12 text-center text-sm text-zinc-500">
        No recordings found. Complete an interview to save your session.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {recordings.map((recording, idx) => {
          const date = formatRecordingDate(recording.lastModified);
          const formattedSize = `${(recording.size / (1024 * 1024)).toFixed(2)} MB`;

          const interviewId = extractInterviewIdFromVideoKey(recording.key);
          const canOpen = Boolean(interviewId);

          return (
            <FadeIn
              key={recording.key}
              delay={idx * 0.08}
              direction="up"
              className={`group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all hover:border-blue-200 hover:shadow-lg flex flex-col ${canOpen ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}
              role={canOpen ? "button" : undefined}
              tabIndex={canOpen ? 0 : -1}
              onClick={() => canOpen && openRecording(recording, date)}
              onKeyDown={(event) => {
                if (!canOpen) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openRecording(recording, date);
                }
              }}
              aria-label={canOpen ? "Open recording details" : "Recording is unavailable"}
            >
              <div className="relative aspect-video shrink-0 bg-zinc-900">
                <video
                  src={`${recording.url}#t=0.001`}
                  crossOrigin="anonymous"
                  preload="metadata"
                  className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-black/20">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                    <svg className="h-6 w-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <h3 className="truncate text-sm font-semibold text-zinc-900">Interview Session</h3>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setRecordingToDelete(recording.key);
                    }}
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
                {!canOpen && (
                  <p className="mt-2 text-xs text-amber-700">No linked interview session found for this file.</p>
                )}
              </div>
            </FadeIn>
          );
        })}
      </div>

      <DeleteConfirmationModal
        isOpen={recordingToDelete !== null}
        onClose={() => setRecordingToDelete(null)}
        onConfirm={handleDeleteRecording}
        isDeleting={deletingKey !== null}
      />

      {selectedVideo && (
        <RecordingModal
          isOpen={true}
          onClose={() => setSelectedVideo(null)}
          videoUrl={selectedVideo.url}
          interviewId={selectedVideo.interviewId}
          videoDate={selectedVideo.date}
        />
      )}
    </>
  );
}
