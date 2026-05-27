import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSharedInterview } from "@/repositories/interview-repo";
import { getScoreColor, getScoreLabel } from "@/utils/helpers";

const getSharedInterviewCached = cache(getSharedInterview);

type Evaluation = {
  score: number;
  feedback: string;
  strengths: string[];
  areasForImprovement: string[];
  communication?: number;
  technicalDepth?: number;
  clarity?: number;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const interview = await getSharedInterviewCached(token);
  if (!interview) {
    return {
      title: "Shared Interview",
      description: "This SnapInterview share link is no longer active.",
      robots: { index: false, follow: false },
    };
  }

  const evalScore =
    interview.evaluation && typeof (interview.evaluation as { score?: unknown }).score === "number"
      ? (interview.evaluation as { score: number }).score
      : null;

  const titleSuffix = interview.company ? ` at ${interview.company}` : "";
  const title = `${interview.role}${titleSuffix} — Mock Interview`;
  const description = evalScore !== null
    ? `Scored ${evalScore}/100 on a ${interview.difficulty} ${interview.type} mock interview. View the full evaluation on SnapInterview.`
    : `${interview.difficulty} ${interview.type} mock interview evaluation on SnapInterview.`;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "SnapInterview",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function parseEvaluation(raw: Record<string, unknown> | null): Evaluation | null {
  if (!raw || typeof raw.score !== "number" || typeof raw.feedback !== "string") return null;
  return {
    score: raw.score,
    feedback: raw.feedback,
    strengths: Array.isArray(raw.strengths) ? (raw.strengths as string[]) : [],
    areasForImprovement: Array.isArray(raw.areasForImprovement) ? (raw.areasForImprovement as string[]) : [],
    communication: typeof raw.communication === "number" ? raw.communication : undefined,
    technicalDepth: typeof raw.technicalDepth === "number" ? raw.technicalDepth : undefined,
    clarity: typeof raw.clarity === "number" ? raw.clarity : undefined,
  };
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function SharedInterviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const interview = await getSharedInterviewCached(token);
  if (!interview) notFound();

  const evaluation = parseEvaluation(interview.evaluation);
  const date = dateFormatter.format(new Date(interview.createdAt));

  const subScores = evaluation
    ? [
        { label: "Communication", value: evaluation.communication ?? null },
        { label: "Technical Depth", value: evaluation.technicalDepth ?? null },
        { label: "Clarity", value: evaluation.clarity ?? null },
      ].filter((s) => s.value !== null)
    : [];

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-base font-bold tracking-tight text-zinc-900">
            SnapInterview
          </Link>
          <Link
            href="/practice"
            className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-700"
          >
            Try it yourself
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        {/* Title card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">Interview Evaluation</p>
          <h1 className="text-2xl font-bold text-zinc-900">{interview.role}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            {interview.company && <span>{interview.company}</span>}
            {interview.company && <span className="h-1 w-1 rounded-full bg-zinc-300" />}
            <span className="capitalize">{interview.type}</span>
            <span className="h-1 w-1 rounded-full bg-zinc-300" />
            <span className="capitalize">{interview.difficulty}</span>
            <span className="h-1 w-1 rounded-full bg-zinc-300" />
            <span>{date}</span>
          </div>
        </div>

        {evaluation ? (
          <>
            {/* Score */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 flex items-center gap-6">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-zinc-50 ring-1 ring-zinc-200">
                <span className="text-3xl font-bold text-zinc-900">{evaluation.score}</span>
              </div>
              <div>
                <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold mb-2 ${getScoreColor(evaluation.score)}`}>
                  {getScoreLabel(evaluation.score)}
                </span>
                <p className="text-sm text-zinc-600 leading-relaxed">{evaluation.feedback}</p>
              </div>
            </div>

            {/* Sub-scores */}
            {subScores.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {subScores.map((s) => (
                  <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
                    <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Strengths + Improvements */}
            <div className="grid gap-4 sm:grid-cols-2">
              {evaluation.strengths.length > 0 && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                  <h3 className="mb-3 text-sm font-semibold text-emerald-800">Strengths</h3>
                  <ul className="space-y-2">
                    {evaluation.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                        <span className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500">
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluation.areasForImprovement.length > 0 && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
                  <h3 className="mb-3 text-sm font-semibold text-amber-800">Areas for Improvement</h3>
                  <ul className="space-y-2">
                    {evaluation.areasForImprovement.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                        <span className="mt-0.5 h-4 w-4 shrink-0 text-amber-500">
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                          </svg>
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
            Evaluation not yet available for this interview.
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-zinc-900 mb-1">Want to practice too?</p>
          <p className="text-xs text-zinc-500 mb-4">SnapInterview gives you AI-powered mock interviews with instant scored feedback.</p>
          <Link
            href="/practice"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
          >
            Start a free interview
          </Link>
        </div>
      </main>
    </div>
  );
}
