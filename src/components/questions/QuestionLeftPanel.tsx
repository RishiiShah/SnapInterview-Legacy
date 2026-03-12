"use client";

import { CATEGORIES } from "@/data/constants";
import type { Question, Difficulty, InterviewType } from "@/data/types";
import {
    IconAcademicCap,
    IconCheckCircle,
    IconChevronUp,
    IconLightBulb,
    IconTag,
} from "@/components/ui/icons";

export type LeftTab = "description" | "solutions";

interface QuestionLeftPanelProps {
    question: Question;
    leftTab: LeftTab;
    setLeftTab: (tab: LeftTab) => void;
    showHint: boolean; setShowHint: (v: boolean) => void;
    showTopics: boolean; setShowTopics: (v: boolean) => void;
    showSample: boolean; setShowSample: (v: boolean) => void;
    isSolved: boolean;
    isSolveUpdating: boolean;
    solveError: string | null;
    handleToggleSolved: () => void;
}

const diffColor = (d: Difficulty) =>
    ({ easy: "text-emerald-400", medium: "text-amber-400", hard: "text-red-400" })[d];
const diffLabel = (d: Difficulty) =>
    ({ easy: "Easy", medium: "Medium", hard: "Hard" })[d];
const catInfo = (c: InterviewType) => CATEGORIES.find((x) => x.value === c);

export function QuestionLeftPanel({
    question, leftTab, setLeftTab, showHint, setShowHint, showTopics, setShowTopics,
    showSample, setShowSample, isSolved, isSolveUpdating, solveError, handleToggleSolved
}: QuestionLeftPanelProps) {
    return (
        <div className="flex w-1/2 flex-col border-r border-[#ffffff0f]">
            {/* Tabs */}
            <div className="flex shrink-0 items-center gap-1 border-b border-[#ffffff0f] px-4 py-0">
                {(["description", "solutions"] as LeftTab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setLeftTab(tab)}
                        className={`cursor-pointer border-b-2 px-3 py-2.5 text-xs font-medium capitalize transition-colors ${leftTab === tab
                            ? "border-white text-white"
                            : "border-transparent text-zinc-500 hover:text-zinc-300"
                            }`}
                    >
                        {tab === "description" ? "📄 Description" : "💡 Solutions"}
                    </button>
                ))}
            </div>

            {/* Content (scrollable) */}
            <div className="flex-1 overflow-y-auto p-6">
                {leftTab === "description" ? (
                    <div className="space-y-5">
                        {/* Title + difficulty */}
                        <div>
                            <h1 className="text-lg font-bold text-white leading-relaxed">
                                {question.id}. {question.text}
                            </h1>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className={`text-xs font-semibold ${diffColor(question.difficulty)}`}>
                                    {diffLabel(question.difficulty)}
                                </span>
                            </div>
                        </div>

                        {/* Description text */}
                        <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
                            <p>
                                Prepare a structured response to this interview question. Think about specific examples from your experience and how they demonstrate the required competencies.
                            </p>
                            <p>
                                <strong className="text-zinc-200">Category:</strong>{" "}
                                <span className="text-zinc-300">{catInfo(question.category)?.label}</span>
                            </p>
                            <p>
                                <strong className="text-zinc-200">Estimated Time:</strong>{" "}
                                <span className="text-zinc-300">{question.estimatedTime}</span>
                            </p>
                            <div className="pt-1">
                                <button
                                    onClick={() => handleToggleSolved()}
                                    disabled={isSolveUpdating}
                                    className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${isSolved
                                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                                        : "border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                                >
                                    <IconCheckCircle className="h-3.5 w-3.5" />
                                    {isSolveUpdating ? "Updating..." : isSolved ? "Solved" : "Mark as Solved"}
                                </button>
                                {solveError && <p className="mt-2 text-xs text-red-400">{solveError}</p>}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-[#ffffff0f]" />

                        {/* Topics (collapsible) */}
                        <button
                            onClick={() => setShowTopics(!showTopics)}
                            className="flex w-full items-center justify-between py-1 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                        >
                            <span className="flex items-center gap-2">
                                <IconTag className="h-4 w-4" />
                                Topics
                            </span>
                            <IconChevronUp className={`h-4 w-4 transition-transform ${showTopics ? "rotate-180" : ""}`} />
                        </button>
                        {showTopics && (
                            <div className="flex flex-wrap gap-2">
                                {question.tags.map((tag: string) => (
                                    <span key={tag} className="rounded-full bg-[#ffffff0a] border border-[#ffffff14] px-3 py-1 text-xs font-medium text-zinc-300">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Hint (collapsible) */}
                        {question.hint && (
                            <>
                                <button
                                    onClick={() => setShowHint(!showHint)}
                                    className="flex w-full items-center justify-between py-1 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                                >
                                    <span className="flex items-center gap-2">
                                        <IconLightBulb className="h-4 w-4 text-amber-400" />
                                        Hint
                                    </span>
                                    <IconChevronUp className={`h-4 w-4 transition-transform ${showHint ? "rotate-180" : ""}`} />
                                </button>
                                {showHint && (
                                    <p className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200 leading-relaxed">
                                        {question.hint}
                                    </p>
                                )}
                            </>
                        )}

                        {/* Sample answer (collapsible) */}
                        {question.sampleAnswer && (
                            <>
                                <button
                                    onClick={() => setShowSample(!showSample)}
                                    className="flex w-full items-center justify-between py-1 text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                                >
                                    <span className="flex items-center gap-2">
                                        <IconAcademicCap className="h-4 w-4" />
                                        Sample Answer
                                    </span>
                                    <IconChevronUp className={`h-4 w-4 transition-transform ${showSample ? "rotate-180" : ""}`} />
                                </button>
                                {showSample && (
                                    <p className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-200 leading-relaxed">
                                        {question.sampleAnswer}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    /* Solutions tab */
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-[#ffffff0a] text-zinc-500">
                            <IconLightBulb className="h-6 w-6" />
                        </div>
                        <p className="text-sm text-zinc-400">Community solutions coming soon.</p>
                        <p className="mt-1 text-xs text-zinc-600">Practice this question and build your own approach.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
