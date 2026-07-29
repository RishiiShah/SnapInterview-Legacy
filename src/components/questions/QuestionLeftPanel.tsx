"use client";

import { CATEGORIES } from "@/data/constants";
import type { Question, Difficulty, InterviewType } from "@/data/types";
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
const catInfo = (c: InterviewType) => CATEGORIES.find((x) => x.value === c);

export function QuestionLeftPanel({
    question, leftTab, setLeftTab, showHint, setShowHint, showTopics, setShowTopics,
    showSample, setShowSample, isSolved, isSolveUpdating, solveError, handleToggleSolved
}: QuestionLeftPanelProps) {
    return (
        <div className="flex w-1/2 flex-col border-r border-zinc-200 bg-white">
            {/* Tabs */}
            <div className="flex shrink-0 items-center gap-1 border-b border-zinc-100 px-4 bg-white/50 backdrop-blur-sm">
                {(["description", "solutions"] as LeftTab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setLeftTab(tab)}
                        className={`relative cursor-pointer px-4 py-3 text-xs font-semibold capitalize transition-all ${
                            leftTab === tab
                                ? "text-zinc-900"
                                : "text-zinc-400 hover:text-zinc-600"
                        }`}
                    >
                        {tab === "description" ? "📄 Description" : "💡 Solutions"}
                        {leftTab === tab && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600 rounded-full mx-2" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content (scrollable) */}
            <div className="flex-1 overflow-y-auto p-6">
                {leftTab === "description" ? (
                    <div className="space-y-5">
                        {/* Title + difficulty */}
                        <div>
                            <h1 className="text-xl font-bold text-zinc-900 leading-tight tracking-tight">
                                {question.id}. {question.text}
                            </h1>
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                                    question.difficulty === 'easy' ? 'bg-sky-50 text-sky-600' :
                                    question.difficulty === 'medium' ? 'bg-amber-50 text-amber-600' :
                                    'bg-red-50 text-red-600'
                                }`}>
                                    {diffLabel(question.difficulty)}
                                </span>
                            </div>
                        </div>

                        {/* Description text */}
                        <div className="space-y-4 text-sm text-zinc-600 leading-relaxed">
                            {question.type === "coding" && question.description ? (
                                <>
                                    <div className="whitespace-pre-wrap">{question.description}</div>
                                    {question.constraints && (
                                        <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Constraints</p>
                                            <pre className="text-xs text-zinc-700 font-mono whitespace-pre-wrap">{question.constraints}</pre>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p>
                                    Prepare a structured response to this interview question. Think about specific examples from your experience and how they demonstrate the required competencies.
                                </p>
                            )}
                            <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Category</p>
                                    <p className="mt-0.5 font-medium text-zinc-900">{catInfo(question.category)?.label}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Time Est.</p>
                                    <p className="mt-0.5 font-medium text-zinc-900">{question.estimatedTime}</p>
                                </div>
                            </div>
                            <div className="pt-2">
                                <button
                                    onClick={() => handleToggleSolved()}
                                    disabled={isSolveUpdating}
                                    className={`group cursor-pointer inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-all ${isSolved
                                        ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100/80"
                                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
                                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                                >
                                    <IconCheckCircle className={`h-4 w-4 transition-transform ${isSolved ? 'scale-110' : 'group-hover:scale-110'}`} />
                                    {isSolveUpdating ? "Updating..." : isSolved ? "Solved" : "Mark as Solved"}
                                </button>
                                {solveError && <p className="mt-2 text-xs text-red-400">{solveError}</p>}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-zinc-100" />

                        {/* Topics (collapsible) */}
                        <button
                            onClick={() => setShowTopics(!showTopics)}
                            className="flex w-full cursor-pointer items-center justify-between py-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-900"
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
                                    <span key={tag} className="rounded-lg bg-zinc-100/50 border border-zinc-200/50 px-3 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 transition-colors">
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
                                    className="flex w-full cursor-pointer items-center justify-between py-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-900"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <IconLightBulb className="h-4 w-4 text-amber-500" />
                                        Hint
                                    </span>
                                    <IconChevronDown className={`h-4 w-4 transition-transform duration-300 ${showHint ? "rotate-180" : ""}`} />
                                </button>
                                {showHint && (
                                    <div className="rounded-xl bg-amber-50/50 border border-amber-100 px-5 py-4 text-sm text-zinc-700 leading-relaxed shadow-sm">
                                        {question.hint}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Sample answer (collapsible) */}
                        {question.sampleAnswer && (
                            <>
                                <button
                                    onClick={() => setShowSample(!showSample)}
                                    className="flex w-full cursor-pointer items-center justify-between py-2 text-sm font-semibold text-sky-600 transition-colors hover:text-sky-700"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <IconAcademicCap className="h-4 w-4" />
                                        Sample Answer
                                    </span>
                                    <IconChevronDown className={`h-4 w-4 transition-transform duration-300 ${showSample ? "rotate-180" : ""}`} />
                                </button>
                                {showSample && (
                                    <div className="rounded-xl bg-sky-50/50 border border-sky-100 px-5 py-4 text-sm text-zinc-700 leading-relaxed shadow-sm">
                                        {question.sampleAnswer}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    /* Solutions tab */
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-zinc-50 border border-zinc-100 text-zinc-400">
                            <IconLightBulb className="h-7 w-7" />
                        </div>
                        <p className="text-sm font-semibold text-zinc-900">Community solutions coming soon.</p>
                        <p className="mt-2 max-w-[240px] text-xs text-zinc-500 leading-relaxed">Practice this question and build your own approach to share with others.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
