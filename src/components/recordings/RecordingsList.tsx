"use client";

import { useState } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/ui/motion";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";
import Modal from "@/components/ui/Modal";
import RecordingModal from "./RecordingModal";
import type { VideoRecording } from "@/lib/s3/videos";
import { extractInterviewIdFromVideoKey } from "@/lib/interview/recordings";
import { IconSpinner } from "@/components/ui/icons";

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
  initialNextToken?: string;
};

export default function RecordingsList({ initialVideos, initialNextToken }: RecordingsListProps) {
  const [recordings, setRecordings] = useState<VideoRecording[]>(initialVideos);
  const [nextToken, setNextToken] = useState<string | undefined>(initialNextToken);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isOpening, setIsOpening] = useState<string | null>(null);
  
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [recordingToDelete, setRecordingToDelete] = useState<string | null>(null);
  const [deleteInterviewData, setDeleteInterviewData] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; interviewId: string; date: string } | null>(null);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
  });

  const loadMore = async () => {
    if (isLoadingMore || !nextToken) return;

    setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/s3/videos?cursor=${encodeURIComponent(nextToken)}&limit=12`);
      if (!res.ok) throw new Error("Failed to load more recordings");
      
      const data = await res.json();
      setRecordings((prev) => [...prev, ...data.videos]);
      setNextToken(data.nextContinuationToken);
    } catch (error) {
      console.error("Load more error:", error);
      setErrorModal({
        isOpen: true,
        title: "Error",
        description: "Failed to load more recordings. Please try again.",
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const openRecording = async (recording: VideoRecording, date: string) => {
    const interviewId = extractInterviewIdFromVideoKey(recording.key);
    if (!interviewId) return;

    if (recording.url) {
      setSelectedVideo({ url: recording.url, interviewId, date });
      return;
    }

    // Sign on demand
    setIsOpening(recording.key);
    try {
      const res = await fetch("/api/s3/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: recording.key }),
      });

      if (!res.ok) throw new Error("Failed to get video access");
      
      const { url } = await res.json();
      setSelectedVideo({
        url,
        interviewId,
        date,
      });
      
      // Cache the URL locally for this session
      setRecordings(prev => prev.map(r => r.key === recording.key ? { ...r, url } : r));
    } catch (error) {
      console.error("Error opening recording:", error);
      setErrorModal({
        isOpen: true,
        title: "Access Denied",
        description: "Unable to retrieve the video. Please try again later.",
      });
    } finally {
      setIsOpening(null);
    }
  };

  const handleDeleteRecording = async () => {
    if (!recordingToDelete) return;

    setDeletingKey(recordingToDelete);
    try {
      const res = await fetch("/api/s3/videos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: recordingToDelete, deleteInterviewData }),
      });

      if (res.ok) {
        setRecordings((prev) => prev.filter((recording) => recording.key !== recordingToDelete));
        setRecordingToDelete(null);
        setDeleteInterviewData(false);
      } else {
        setErrorModal({
          isOpen: true,
          title: "Delete Failed",
          description: "Failed to delete recording. Please try again later.",
        });
      }
    } catch (error) {
      console.error("Error deleting recording:", error);
      setErrorModal({
        isOpen: true,
        title: "Delete Error",
        description: "An unexpected error occurred while deleting the recording.",
      });
    } finally {
      setDeletingKey(null);
    }
  };

  if (recordings.length === 0 && !isLoadingMore) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/40 px-6 py-20 text-center">
        <p className="text-base font-semibold text-zinc-800">No recordings yet</p>
        <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
          Your interview recordings will appear here once you complete a session with video enabled.
        </p>
        <Link
          href="/practice"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
        >
          Start an Interview
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
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
          const isProcessing = isOpening === recording.key;

          return (
            <FadeIn
              key={recording.key}
              delay={idx * 0.08}
              direction="up"
              className={`group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all hover:border-blue-200 hover:shadow-lg flex flex-col ${canOpen ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}
              role={canOpen ? "button" : undefined}
              tabIndex={canOpen ? 0 : -1}
              onClick={() => canOpen && !isProcessing && openRecording(recording, date)}
              onKeyDown={(event) => {
                if (!canOpen || isProcessing) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openRecording(recording, date);
                }
              }}
              aria-label={canOpen ? "Open recording details" : "Recording is unavailable"}
            >
              <div className="relative aspect-video shrink-0 bg-zinc-900 flex items-center justify-center">
                {recording.url ? (
                  <video
                    src={`${recording.url}#t=0.001`}
                    crossOrigin="anonymous"
                    preload="metadata"
                    className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <svg className="h-8 w-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v7.764a1 1 0 01-1.447.894L15 15M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] uppercase tracking-widest font-semibold opacity-40">Ready to play</span>
                  </div>
                )}
                
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-black/20">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                    {isProcessing ? (
                      <IconSpinner className="h-6 w-6 text-white" />
                    ) : (
                      <svg className="h-6 w-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <h3 className="truncate text-sm font-semibold text-zinc-900">Interview Session</h3>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteInterviewData(false);
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

      {nextToken && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-8 py-2.5 text-sm font-semibold text-zinc-900 transition-all hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? (
              <>
                <IconSpinner className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load more recordings"
            )}
          </button>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={recordingToDelete !== null}
        onClose={() => {
          setRecordingToDelete(null);
          setDeleteInterviewData(false);
        }}
        onConfirm={handleDeleteRecording}
        isDeleting={deletingKey !== null}
        title="Delete Recording"
        description={deleteInterviewData
          ? "This will permanently delete the recording and all interview data (score, transcript, and feedback)."
          : "This will delete only the recording. Your score and feedback will stay available for learning progress."}
        confirmLabel={deleteInterviewData ? "Delete Everything" : "Delete Recording"}
        extraContent={
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left">
            <input
              type="checkbox"
              checked={deleteInterviewData}
              onChange={(event) => setDeleteInterviewData(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-xs text-zinc-600">
              Also delete interview data (score, transcript, and feedback)
            </span>
          </label>
        }
      />

      <Modal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        description={errorModal.description}
        variant="danger"
        confirmLabel="OK"
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
