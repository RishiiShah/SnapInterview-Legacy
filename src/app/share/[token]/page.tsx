import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AppLogo } from "@/components/ui/AppLogo";
import { getSharedInterview } from "@/repositories/interview-repo";
import { getScoreLabel } from "@/utils/helpers";

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
  const description =
    evalScore !== null
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
    areasForImprovement: Array.isArray(raw.areasForImprovement)
      ? (raw.areasForImprovement as string[])
      : [],
    communication: typeof raw.communication === "number" ? raw.communication : undefined,
    technicalDepth: typeof raw.technicalDepth === "number" ? raw.technicalDepth : undefined,
    clarity: typeof raw.clarity === "number" ? raw.clarity : undefined,
  };
}

function shareScoreTone(score: number): string {
  if (score >= 80) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (score >= 70) return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-red-500/30 bg-red-500/10 text-red-300";
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
    <div className="min-h-screen bg-[#0B0C10] text-[#E8ECF4]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.12),_transparent_55%)]"
      />

      <header className="relative border-b border-white/[0.06] bg-[#0C0E14]/70 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <AppLogo size={28} className="rounded-md" />
            <span className="text-sm font-semibold tracking-tight text-[#F5F7FF]">
              Snap<span className="text-blue-400">Interview</span>
            </span>
          </Link>
          <Link
            href="/practice"
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#4B8FF7]"
          >
            Try it yourself
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl space-y-8 px-6 py-12">
        <section>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#A8B0C2]">
            Interview evaluation
          </p>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-[#F2F4F8] sm:text-4xl">
            {interview.role}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#A8B0C2]">
            {interview.company ? <span>{interview.company}</span> : null}
            {interview.company ? <span className="h-1 w-1 rounded-full bg-white/20" aria-hidden /> : null}
            <span className="capitalize">{interview.type}</span>
            <span className="h-1 w-1 rounded-full bg-white/20" aria-hidden />
            <span className="capitalize">{interview.difficulty}</span>
            <span className="h-1 w-1 rounded-full bg-white/20" aria-hidden />
            <span>{date}</span>
          </div>
        </section>

        {evaluation ? (
          <>
            <section className="flex items-start gap-6 border-y border-white/[0.06] py-8">
              <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                <span className="font-mono text-4xl font-medium tracking-tight text-[#F2F4F8]">
                  {evaluation.score}
                </span>
                <span className="mt-0.5 text-[10px] uppercase tracking-wider text-[#A8B0C2]">
                  / 100
                </span>
              </div>
              <div className="min-w-0 pt-1">
                <span
                  className={`inline-block rounded-md border px-2.5 py-1 text-xs font-semibold ${shareScoreTone(evaluation.score)}`}
                >
                  {getScoreLabel(evaluation.score)}
                </span>
                <p className="mt-3 text-sm leading-relaxed text-[#C5CBD8]">
                  {evaluation.feedback}
                </p>
              </div>
            </section>

            {subScores.length > 0 && (
              <section className="grid grid-cols-3 gap-3">
                {subScores.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-white/[0.08] bg-[#12141A] px-4 py-5 text-center"
                  >
                    <p className="font-mono text-2xl font-medium tracking-tight text-[#F2F4F8]">
                      {s.value}
                    </p>
                    <p className="mt-1 text-xs text-[#A8B0C2]">{s.label}</p>
                  </div>
                ))}
              </section>
            )}

            <section className="grid gap-8 sm:grid-cols-2">
              {evaluation.strengths.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[#F2F4F8]">Strengths</h3>
                  <ul className="mt-4 space-y-3">
                    {evaluation.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-[#C5CBD8]">
                        <span className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400">
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12.75l6 6 9-13.5"
                            />
                          </svg>
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluation.areasForImprovement.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[#F2F4F8]">Areas for improvement</h3>
                  <ul className="mt-4 space-y-3">
                    {evaluation.areasForImprovement.map((s, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-[#C5CBD8]">
                        <span className="mt-0.5 h-4 w-4 shrink-0 text-amber-400">
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                            />
                          </svg>
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="rounded-xl border border-white/[0.08] bg-[#12141A] px-6 py-10 text-center text-sm text-[#A8B0C2]">
            Evaluation not yet available for this interview.
          </section>
        )}

        <section className="border-t border-white/[0.06] pt-10 text-center">
          <p className="text-sm font-semibold text-[#F2F4F8]">Want to practice too?</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#A8B0C2]">
            SnapInterview gives you AI-powered mock interviews with instant scored feedback.
          </p>
          <Link
            href="/practice"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4B8FF7]"
          >
            Start a free interview
          </Link>
        </section>
      </main>
    </div>
  );
}
