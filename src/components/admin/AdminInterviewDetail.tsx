import { Suspense } from "react";
import Link from "next/link";

import {
  addInterviewModerationNoteAction,
  hardDeleteInterviewAction,
  repairLegacyRecordingMetadataAction,
} from "@/app/admin/(protected)/interviews/actions";
import { RecordingEvaluation } from "@/components/recordings/RecordingEvaluation";
import { Button } from "@/components/ui/Button";
import type { AdminInterviewDetail } from "@/lib/admin/interview-detail";
import { AdminOrphanedRecordings } from "./AdminOrphanedRecordings";
import { AdminInterviewTranscript } from "./AdminInterviewTranscript";
import { CopyableField } from "./CopyableField";
import { IntegrityBadge } from "./IntegrityBadge";
import { adminActionButtonClass, adminDangerButtonClass } from "./admin-styles";
import { ConfirmActionForm } from "./ConfirmActionForm";

const textareaClass =
  "w-full min-h-[96px] resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100";

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function ratingLabel(rating: string) {
  if (rating === "up") return "Thumbs up";
  if (rating === "down") return "Thumbs down";
  return rating;
}

function ratingClass(rating: string) {
  if (rating === "up") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (rating === "down") return "border-red-200 bg-red-50 text-red-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-sm text-zinc-900">{value}</p>
    </div>
  );
}

export default function AdminInterviewDetailView({ interview }: { interview: AdminInterviewDetail }) {
  const feedbackByOrder = new Map(
    interview.questionFeedback.map((f) => [f.questionOrder, f]),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/interviews"
            className="cursor-pointer text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
          >
            ← Back to interviews
          </Link>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            Interview detail
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {interview.user.name ?? "Unknown"} · {interview.user.email ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IntegrityBadge integrity={interview.recordingIntegrity} />
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700">
            {interview.status}
          </span>
          <ConfirmActionForm
            action={hardDeleteInterviewAction}
            hiddenFields={{ interviewId: interview.id }}
            buttonLabel="Delete interview"
            buttonClassName={`${adminDangerButtonClass} px-3 py-1.5 text-sm`}
            confirmMessage="Permanently delete this interview, transcript, feedback, notes, and S3 recording? This cannot be undone."
            reasonRequired
            reasonPrompt="Reason for deletion"
          />
        </div>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Recording integrity</h3>
        <p className="mt-1 text-sm text-zinc-500">{interview.recordingIntegrity.description}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {interview.videoKey ? (
            <CopyableField label="Video key" value={interview.videoKey} />
          ) : (
            <MetaItem label="Video key" value="—" />
          )}
          <CopyableField label="Interview ID" value={interview.id} />
        </div>
        {interview.videoUrl && (
          <div className="mt-4">
            <CopyableField label="Stored video URL" value={interview.videoUrl} />
          </div>
        )}
        {interview.recordingIntegrity.status === "url_without_key" && (
          <form action={repairLegacyRecordingMetadataAction} className="mt-4">
            <input type="hidden" name="interviewId" value={interview.id} />
            <button type="submit" className={`${adminActionButtonClass} px-3 py-1.5 text-sm`}>
              Repair recording metadata
            </button>
          </form>
        )}
        {interview.signedPlaybackUrl && (
          <p className="mt-4">
            <a
              href={interview.signedPlaybackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Open verified recording (signed URL, 1h)
            </a>
          </p>
        )}
        <Suspense fallback={null}>
          <AdminOrphanedRecordings userId={interview.userId} />
        </Suspense>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Session overview</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetaItem label="Role" value={interview.role} />
          <MetaItem label="Type" value={interview.type} />
          <MetaItem label="Difficulty" value={interview.difficulty} />
          <MetaItem label="Company" value={interview.company ?? "—"} />
          <MetaItem label="Persona" value={interview.persona ?? "—"} />
          <MetaItem
            label="Progress"
            value={`${interview.currentQuestion} / ${interview.questionCount} questions`}
          />
          <MetaItem label="Created" value={formatDateTime(interview.createdAtIso)} />
          <MetaItem
            label="S3 check"
            value={
              interview.recordingIntegrity.s3Checked
                ? interview.recordingIntegrity.s3Exists
                  ? "Object found"
                  : "Object missing"
                : "Not checked"
            }
          />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Evaluation summary</h3>
        {interview.evaluationNormalized ? (
          <div className="mt-4">
            <RecordingEvaluation evaluation={interview.evaluationNormalized} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">No evaluation generated for this session yet.</p>
        )}

        <details className="mt-6 group">
          <summary className="cursor-pointer text-sm font-medium text-zinc-600 hover:text-zinc-900">
            Raw evaluation payload
          </summary>
          <pre className="mt-3 max-h-80 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700">
            {interview.evaluation
              ? JSON.stringify(interview.evaluation, null, 2)
              : "null"}
          </pre>
        </details>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Question feedback</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Per-question thumbs up/down from the candidate after the interview.
        </p>
        {interview.questionFeedback.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No question feedback recorded.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Question #</th>
                  <th className="px-3 py-2">Rating</th>
                  <th className="px-3 py-2">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {interview.questionFeedback.map((entry) => (
                  <tr key={entry.id} className="border-b border-zinc-100 last:border-b-0">
                    <td className="px-3 py-2 text-zinc-700">Q{entry.questionOrder + 1}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${ratingClass(entry.rating)}`}
                      >
                        {ratingLabel(entry.rating)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {formatDateTime(entry.createdAtIso)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Transcript</h3>
        <p className="mt-1 text-sm text-zinc-500">{interview.transcript.length} entries</p>
        {interview.transcript.length > 0 && interview.questionFeedback.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {interview.transcript.map((entry, idx) => {
              const feedback = feedbackByOrder.get(entry.order);
              if (!feedback) return null;
              return (
                <span
                  key={entry.id}
                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${ratingClass(feedback.rating)}`}
                >
                  Q{idx + 1}: {ratingLabel(feedback.rating)}
                </span>
              );
            })}
          </div>
        )}
        <div className="mt-4">
          <AdminInterviewTranscript transcript={interview.transcript} />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Moderation notes</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Internal notes for support and quality review. Visible only to admins.
        </p>

        <form action={addInterviewModerationNoteAction} className="mt-4 space-y-3">
          <input type="hidden" name="interviewId" value={interview.id} />
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Add note</span>
            <textarea
              name="note"
              required
              placeholder="Document investigation findings, quality issues, or follow-up actions…"
              className={`${textareaClass} mt-1.5`}
            />
          </label>
          <Button type="submit" size="md">
            Save note
          </Button>
        </form>

        {interview.moderationNotes.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">No moderation notes yet.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {interview.moderationNotes.map((note) => (
              <li
                key={note.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
              >
                <p className="whitespace-pre-wrap text-sm text-zinc-800">{note.note}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {note.authorEmail} · {formatDateTime(note.createdAtIso)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(interview.focusAreas != null || interview.sessionPlan != null) && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">Session metadata</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {interview.focusAreas != null && (
              <details>
                <summary className="cursor-pointer text-sm font-medium text-zinc-600">
                  Focus areas
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs">
                  {JSON.stringify(interview.focusAreas, null, 2)}
                </pre>
              </details>
            )}
            {interview.sessionPlan != null && (
              <details>
                <summary className="cursor-pointer text-sm font-medium text-zinc-600">
                  Session plan
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs">
                  {JSON.stringify(interview.sessionPlan, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
