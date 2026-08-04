"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Question } from "@/data/types";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { QuestionLeftPanel, type LeftTab } from "@/components/questions/QuestionLeftPanel";
import { QuestionRightPanel, type RightTab } from "@/components/questions/QuestionRightPanel";
import { useResizableSplit } from "@/hooks/useResizableSplit";
import { cn } from "@/lib/utils";

type QuestionDetailPageClientProps = {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  prevQuestion: Question | null;
  nextQuestion: Question | null;
  basePath?: "/questions" | "/coding";
  listLabel?: string;
};

export default function QuestionDetailPageClient({
  question,
  currentIndex,
  totalQuestions,
  prevQuestion,
  nextQuestion,
  basePath = "/questions",
  listLabel = "Problem List",
}: QuestionDetailPageClientProps) {
  const [leftTab, setLeftTab] = useState<LeftTab>("description");
  const [answerText, setAnswerText] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerStarted, setIsTimerStarted] = useState(false);
  const [score, setScore] = useState<{ score: number; feedback: string; state: "evaluating" | "completed" } | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>("answer");
  const [isSolved, setIsSolved] = useState(false);
  const [isSolveUpdating, setIsSolveUpdating] = useState(false);
  const [solveError, setSolveError] = useState<string | null>(null);

  const {
    percent: leftPercent,
    containerRef: splitRef,
    handleProps: splitHandleProps,
  } = useResizableSplit({
    orientation: "horizontal",
    initialPercent: 42,
    minPercent: 28,
    maxPercent: 58,
    storageKey: `snap-${basePath.slice(1)}-split-h`,
  });

  const getMinutes = (value: string) => {
    const match = value.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const evaluateAnswer = useCallback(async () => {
    setIsTimerRunning(false);
    setScore({ score: 0, feedback: "", state: "evaluating" });
    setRightTab("result");

    try {
      const res = await fetch("/api/questions/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, answer: answerText }),
      });

      if (!res.ok) {
        const fallbackFeedback =
          answerText.trim().length > 20
            ? "Your answer was captured, but evaluation failed. Please try submitting again."
            : "Please provide a more detailed answer and try again.";

        setScore({
          score: 0,
          state: "completed",
          feedback: fallbackFeedback,
        });
        return;
      }

      const data = await res.json();
      setScore({
        score: typeof data?.score === "number" ? data.score : 0,
        feedback:
          typeof data?.feedback === "string" && data.feedback.length > 0
            ? data.feedback
            : "Evaluation completed.",
        state: "completed",
      });
    } catch {
      setScore({
        score: 0,
        state: "completed",
        feedback: "Evaluation failed due to a network error. Please try again.",
      });
    }
  }, [answerText, question.id]);

  const handleToggleSolved = useCallback(async () => {
    if (isSolveUpdating) return;

    setSolveError(null);
    setIsSolveUpdating(true);

    try {
      const res = await fetch("/api/questions/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSolveError(typeof data?.error === "string" ? data.error : "Failed to update solved state.");
        return;
      }

      setIsSolved(Boolean(data?.solved));
    } catch {
      setSolveError("Failed to update solved state.");
    } finally {
      setIsSolveUpdating(false);
    }
  }, [isSolveUpdating, question.id]);

  useEffect(() => {
    if (!isTimerRunning || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((previous) => {
        const next = Math.max(0, previous - 1);
        if (next === 0) {
          setIsTimerRunning(false);
          void evaluateAnswer();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [evaluateAnswer, isTimerRunning, timeRemaining]);

  useEffect(() => {
    let isCancelled = false;

    const loadSolvedState = async () => {
      try {
        const res = await fetch("/api/questions/solve", { method: "GET" });
        if (!res.ok || isCancelled) return;
        const data = await res.json();
        const solvedIds: number[] = Array.isArray(data?.solvedQuestionIds)
          ? data.solvedQuestionIds.filter((value: unknown): value is number => typeof value === "number")
          : [];
        if (!isCancelled) {
          setIsSolved(solvedIds.includes(question.id));
        }
      } catch {
        if (!isCancelled) {
          setSolveError("Unable to load solved status.");
        }
      }
    };

    void loadSolvedState();

    return () => {
      isCancelled = true;
    };
  }, [question.id]);

  const handleStart = useCallback(() => {
    setScore(null);
    setAnswerText("");
    setShowSample(false);
    setRightTab("answer");
    setTimeRemaining(getMinutes(question.estimatedTime) * 60);
    setIsTimerRunning(true);
    setIsTimerStarted(true);
  }, [question.estimatedTime]);

  const handleSubmit = () => {
    void evaluateAnswer();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 bg-transparent p-2">
      <div className="flex h-11 shrink-0 items-center justify-between rounded-xl border border-white/[0.08] bg-[#12141A]/90 px-4">
        <div className="flex items-center gap-3">
          <Link
            href={basePath}
            className="group flex items-center gap-1.5 text-xs font-medium text-[#A8B0C2] transition-colors hover:text-[#E8ECF4]"
          >
            <IconChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            {listLabel}
          </Link>
        </div>
        <div className="flex items-center gap-1.5">
          {prevQuestion ? (
            <Link
              href={`${basePath}/${prevQuestion.slug}`}
              className="grid h-8 w-8 place-items-center rounded-lg text-[#A8B0C2] transition-colors hover:bg-white/[0.05] hover:text-[#E8ECF4]"
            >
              <IconChevronLeft className="h-4 w-4" />
            </Link>
          ) : (
            <span className="grid h-8 w-8 place-items-center text-[#4B5568]">
              <IconChevronLeft className="h-4 w-4" />
            </span>
          )}
          <span className="min-w-[3.5rem] text-center text-xs font-medium tabular-nums text-[#A8B0C2]">
            {currentIndex + 1} / {totalQuestions}
          </span>
          {nextQuestion ? (
            <Link
              href={`${basePath}/${nextQuestion.slug}`}
              className="grid h-8 w-8 place-items-center rounded-lg text-[#A8B0C2] transition-colors hover:bg-white/[0.05] hover:text-[#E8ECF4]"
            >
              <IconChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="grid h-8 w-8 place-items-center text-[#4B5568]">
              <IconChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>

      <div ref={splitRef} className="relative flex min-h-0 flex-1 overflow-hidden">
        <QuestionLeftPanel
          question={question}
          leftTab={leftTab}
          setLeftTab={setLeftTab}
          showHint={showHint}
          setShowHint={setShowHint}
          showTopics={showTopics}
          setShowTopics={setShowTopics}
          showSample={showSample}
          setShowSample={setShowSample}
          isSolved={isSolved}
          isSolveUpdating={isSolveUpdating}
          solveError={solveError}
          handleToggleSolved={handleToggleSolved}
          widthPercent={leftPercent}
        />

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
          tabIndex={0}
          className={cn(
            "group relative z-10 w-2 shrink-0 cursor-col-resize touch-none",
            "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-white/[0.08]",
            "hover:before:bg-[#3B82F6]/50 active:before:bg-[#3B82F6]",
          )}
          {...splitHandleProps}
        />

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-white/[0.08] bg-[#12141A]/90">
          <QuestionRightPanel
            question={question}
            answerText={answerText}
            setAnswerText={setAnswerText}
            timeRemaining={timeRemaining}
            isTimerStarted={isTimerStarted}
            score={score}
            rightTab={rightTab}
            setRightTab={setRightTab}
            handleStart={handleStart}
            handleSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
