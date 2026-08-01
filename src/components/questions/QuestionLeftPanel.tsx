"use client";

import { CATEGORIES } from "@/data/constants";
import type { Question, Difficulty, QuestionCategory } from "@/data/types";
import {
    IconAcademicCap,
    IconCheckCircle,
    IconChevronDown,
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

const diffLabel = (d: Difficulty) =>
    ({ easy: "Easy", medium: "Medium", hard: "Hard" })[d];
const catInfo = (c: QuestionCategory) => CATEGORIES.find((x) => x.value === c);

export function QuestionLeftPanel({
    question, leftTab, setLeftTab, showHint, setShowHint, showTopics, setShowTopics,
    showSample, setShowSample, isSolved, isSolveUpdating, solveError, handleToggleSolved
}: QuestionLeftPanelProps) {
    return (
        <div className="flex w-1/2 flex-col border-r border-white/[0.08] bg-white/[0.02]">
            <div className="flex shrink-0 items-center gap-1 border-b border-white/[0.06] px-4 bg-white/[0.02]">
                {(["description", "solutions"] as LeftTab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setLeftTab(tab)}
                        className={`relative cursor-pointer px-4 py-3 text-xs font-semibold capitalize transition-all ${
                            leftTab === tab
                                ? "text-[#F2F4F8]"
                                : "text-[#A8B0C2] hover:text-[#C5CBD8]"
                        }`}
                    >
                        {tab === "description" ? "📄 Description" : "💡 Solutions"}
                        {leftTab === tab && (
                            <div className="absolute bottom-0 left-0 right-0 mx-2 h-0.5 rounded-full bg-[#3B82F6]" />
                        )}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {leftTab === "description" ? (
                    <div className="space-y-5">
                        <div>
                            <h1 className="text-xl font-bold leading-tight tracking-tight text-[#F2F4F8]">
                                {question.id}. {question.text}
                            </h1>
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                                    question.difficulty === "easy" ? "bg-sky-500/10 text-sky-300 border-sky-500/20" :
                                    question.difficulty === "medium" ? "bg-amber-500/10 text-amber-300 border-amber-500/20" :
                                    "bg-rose-500/10 text-rose-300 border-rose-500/20"
                                }`}>
                                    {diffLabel(question.difficulty)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4 text-sm leading-relaxed text-[#C5CBD8]">
                            {question.type === "coding" && question.description ? (
                                <>
                                    <div className="whitespace-pre-wrap text-[#E8ECF4]">{question.description}</div>
                                    {question.constraints && (
                                        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                                            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#A8B0C2]">Constraints</p>
                                            <pre className="whitespace-pre-wrap font-mono text-xs text-[#C5CBD8]">{question.constraints}</pre>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p>
                                    Prepare a structured response to this interview question. Think about specific examples from your experience and how they demonstrate the required competencies.
                                </p>
                            )}
                            <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#A8B0C2]">Category</p>
                                    <p className="mt-0.5 font-medium text-[#E8ECF4]">{catInfo(question.category)?.label}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#A8B0C2]">Time Est.</p>
                                    <p className="mt-0.5 font-medium text-[#E8ECF4]">{question.estimatedTime}</p>
                                </div>
                            </div>
                            <div className="pt-2">
                                <button
                                    onClick={() => handleToggleSolved()}
                                    disabled={isSolveUpdating}
                                    className={`group inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-all ${isSolved
                                        ? "border-[#3B82F6]/30 bg-[#3B82F6]/15 text-[#93C5FD] hover:bg-[#3B82F6]/20"
                                        : "border-white/[0.1] bg-white/[0.03] text-[#C5CBD8] hover:bg-white/[0.05] hover:text-[#E8ECF4]"
                                        } disabled:cursor-not-allowed disabled:opacity-60`}
                                >
                                    <IconCheckCircle className={`h-4 w-4 transition-transform ${isSolved ? "scale-110" : "group-hover:scale-110"}`} />
                                    {isSolveUpdating ? "Updating..." : isSolved ? "Solved" : "Mark as Solved"}
                                </button>
                                {solveError && <p className="mt-2 text-xs text-rose-400">{solveError}</p>}
                            </div>
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        <button
                            onClick={() => setShowTopics(!showTopics)}
                            className="flex w-full cursor-pointer items-center justify-between py-2 text-sm font-semibold text-[#C5CBD8] transition-colors hover:text-[#E8ECF4]"
                        >
                            <span className="flex items-center gap-2.5">
                                <IconTag className="h-4 w-4" />
                                Topics
                            </span>
                            <IconChevronDown className={`h-4 w-4 transition-transform duration-300 ${showTopics ? "rotate-180" : ""}`} />
                        </button>
                        {showTopics && (
                            <div className="flex flex-wrap gap-2 pb-2">
                                {question.tags.map((tag: string) => (
                                    <span key={tag} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-[#C5CBD8] transition-colors hover:bg-white/[0.06]">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {question.hint && (
                            <>
                                <button
                                    onClick={() => setShowHint(!showHint)}
                                    className="flex w-full cursor-pointer items-center justify-between py-2 text-sm font-semibold text-[#C5CBD8] transition-colors hover:text-[#E8ECF4]"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <IconLightBulb className="h-4 w-4 text-amber-400" />
                                        Hint
                                    </span>
                                    <IconChevronDown className={`h-4 w-4 transition-transform duration-300 ${showHint ? "rotate-180" : ""}`} />
                                </button>
                                {showHint && (
                                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm leading-relaxed text-[#E8ECF4]">
                                        {question.hint}
                                    </div>
                                )}
                            </>
                        )}

                        {question.sampleAnswer && (
                            <>
                                <button
                                    onClick={() => setShowSample(!showSample)}
                                    className="flex w-full cursor-pointer items-center justify-between py-2 text-sm font-semibold text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <IconAcademicCap className="h-4 w-4" />
                                        Sample Answer
                                    </span>
                                    <IconChevronDown className={`h-4 w-4 transition-transform duration-300 ${showSample ? "rotate-180" : ""}`} />
                                </button>
                                {showSample && (
                                    <div className="rounded-xl border border-[#3B82F6]/20 bg-[#3B82F6]/10 px-5 py-4 text-sm leading-relaxed text-[#E8ECF4]">
                                        {question.sampleAnswer}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-[#A8B0C2]">
                            <IconLightBulb className="h-7 w-7" />
                        </div>
                        <p className="text-sm font-semibold text-[#F2F4F8]">Community solutions coming soon.</p>
                        <p className="mt-2 max-w-[240px] text-xs leading-relaxed text-[#A8B0C2]">Practice this question and build your own approach to share with others.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
