"use client";

import { useState, useEffect } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { CATEGORIES, DIFFICULTIES } from "@/data/constants";
import type { InterviewType, Difficulty, Question } from "@/data/types";
import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";

interface PracticeModalState {
  isOpen: boolean;
  question: Question | null;
  answerText: string;
  isRecording: boolean;
  timeRemaining: number;
  isTimerRunning: boolean;
}

interface ScoreData {
  score: number;
  feedback: string;
  state: "evaluating" | "completed";
}

// Mock questions (will come from DB)
const allQuestions: Question[] = [
  // Behavioral
  { id: 1, text: "Tell me about a time you had to deal with a difficult team member.", category: "behavioral", difficulty: "medium", estimatedTime: "5 min" },
  { id: 2, text: "Describe a situation where you failed and what you learned from it.", category: "behavioral", difficulty: "medium", estimatedTime: "5 min" },
  { id: 3, text: "How do you handle tight deadlines and pressure?", category: "behavioral", difficulty: "easy", estimatedTime: "4 min" },
  { id: 4, text: "Tell me about a time you went above and beyond for a project.", category: "behavioral", difficulty: "easy", estimatedTime: "5 min" },
  { id: 5, text: "Describe a conflict you resolved in a professional setting.", category: "behavioral", difficulty: "hard", estimatedTime: "6 min" },
  { id: 6, text: "How do you prioritize tasks when everything seems urgent?", category: "behavioral", difficulty: "medium", estimatedTime: "4 min" },
  { id: 7, text: "Tell me about a time you had to persuade someone to see your point of view.", category: "behavioral", difficulty: "hard", estimatedTime: "6 min" },
  // Technical
  { id: 8, text: "Explain the difference between REST and GraphQL APIs.", category: "technical", difficulty: "medium", estimatedTime: "5 min" },
  { id: 9, text: "How would you optimize a slow database query?", category: "technical", difficulty: "hard", estimatedTime: "8 min" },
  { id: 10, text: "What is the event loop in Node.js and how does it work?", category: "technical", difficulty: "medium", estimatedTime: "6 min" },
  { id: 11, text: "Explain closures in JavaScript with an example.", category: "technical", difficulty: "easy", estimatedTime: "4 min" },
  { id: 12, text: "How would you implement authentication in a web application?", category: "technical", difficulty: "medium", estimatedTime: "7 min" },
  { id: 13, text: "What are the trade-offs between SQL and NoSQL databases?", category: "technical", difficulty: "medium", estimatedTime: "6 min" },
  { id: 14, text: "Explain how React's virtual DOM works and why it's performant.", category: "technical", difficulty: "easy", estimatedTime: "5 min" },
  { id: 15, text: "How would you handle race conditions in concurrent systems?", category: "technical", difficulty: "hard", estimatedTime: "8 min" },
  // System Design
  { id: 16, text: "Design a URL shortener like bit.ly.", category: "system-design", difficulty: "medium", estimatedTime: "15 min" },
  { id: 17, text: "Design a real-time chat application like Slack.", category: "system-design", difficulty: "hard", estimatedTime: "20 min" },
  { id: 18, text: "Design a news feed system like Twitter.", category: "system-design", difficulty: "hard", estimatedTime: "20 min" },
  { id: 19, text: "Design a rate limiter for an API gateway.", category: "system-design", difficulty: "medium", estimatedTime: "12 min" },
  { id: 20, text: "Design a file storage system like Google Drive.", category: "system-design", difficulty: "hard", estimatedTime: "20 min" },
  { id: 21, text: "Design a notification system for a mobile app.", category: "system-design", difficulty: "medium", estimatedTime: "15 min" },
  { id: 22, text: "Design a simple key-value store.", category: "system-design", difficulty: "easy", estimatedTime: "10 min" },
  // Leadership
  { id: 23, text: "How do you measure success for your team?", category: "leadership", difficulty: "medium", estimatedTime: "5 min" },
  { id: 24, text: "Describe how you've built and scaled a high-performing engineering team.", category: "leadership", difficulty: "hard", estimatedTime: "7 min" },
  { id: 25, text: "How do you handle underperforming team members?", category: "leadership", difficulty: "hard", estimatedTime: "6 min" },
  { id: 26, text: "What's your approach to making technical decisions as a leader?", category: "leadership", difficulty: "medium", estimatedTime: "5 min" },
  { id: 27, text: "How do you foster innovation within your team?", category: "leadership", difficulty: "easy", estimatedTime: "5 min" },
  { id: 28, text: "Describe a time you had to make a difficult trade-off between speed and quality.", category: "leadership", difficulty: "medium", estimatedTime: "6 min" },
];

export default function QuestionsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<InterviewType | "all">("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | "all">("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState<"all" | "0-5" | "5-10" | "10-20" | "20+">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [practiceModal, setPracticeModal] = useState<PracticeModalState>({
    isOpen: false,
    question: null,
    answerText: "",
    isRecording: false,
    timeRemaining: 0,
    isTimerRunning: false,
  });
  const [scores, setScores] = useState<Record<number, ScoreData>>({});

  const timeRanges = [
    { label: "All Times", value: "all" as const },
    { label: "0-5 min", value: "0-5" as const },
    { label: "5-10 min", value: "5-10" as const },
    { label: "10-20 min", value: "10-20" as const },
    { label: "20+ min", value: "20+" as const },
  ];

  const getMinutesFromTime = (timeStr: string): number => {
    const match = timeStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const isInTimeRange = (timeStr: string, range: string): boolean => {
    if (range === "all") return true;
    const minutes = getMinutesFromTime(timeStr);
    if (range === "0-5") return minutes <= 5;
    if (range === "5-10") return minutes > 5 && minutes <= 10;
    if (range === "10-20") return minutes > 10 && minutes <= 20;
    if (range === "20+") return minutes > 20;
    return true;
  };

  const openPracticeModal = (question: Question) => {
    const timeInSeconds = getMinutesFromTime(question.estimatedTime) * 60;

    // Clear previous score if it exists
    setScores(prev => {
      if (prev[question.id]) {
        const newScores = { ...prev };
        delete newScores[question.id];
        return newScores;
      }
      return prev;
    });

    setPracticeModal({
      isOpen: true,
      question,
      answerText: "",
      isRecording: false,
      timeRemaining: timeInSeconds,
      isTimerRunning: true,
    });
  };

  const closePracticeModal = () => {
    setPracticeModal({
      isOpen: false,
      question: null,
      answerText: "",
      isRecording: false,
      timeRemaining: 0,
      isTimerRunning: false,
    });
  };

  const evaluateAnswer = (questionId: number, answer: string) => {
    setTimeout(() => {
      const score = answer.trim().length > 10 ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 40) + 30;
      const feedback = answer.trim().length > 10
        ? "Good response. This is a simulated evaluation. Keep up the good work and try to use the STAR method."
        : "Your response was quite short. Try to add more details and structure your thoughts better.";

      setScores(prev => ({
        ...prev,
        [questionId]: { score, feedback, state: "completed" }
      }));
    }, 2000);
  };

  const handleSubmitAnswer = () => {
    if (practiceModal.question) {
      const qId = practiceModal.question.id;
      const ans = practiceModal.answerText;

      console.log("Answer submitted:", {
        questionId: qId,
        answer: ans,
      });

      // Stop timer
      setPracticeModal(prev => ({ ...prev, isTimerRunning: false }));

      // Set evaluating state
      // Even if empty, we evaluate it to give a 0-score or "too short" feedback
      setScores(prev => ({ ...prev, [qId]: { score: 0, feedback: "", state: "evaluating" } }));
      evaluateAnswer(qId, ans);
    }
  };

  const toggleRecording = () => {
    setPracticeModal((prev) => ({
      ...prev,
      isRecording: !prev.isRecording,
    }));
  };

  const clearAnswer = () => {
    setPracticeModal((prev) => ({
      ...prev,
      answerText: "",
    }));
  };

  // Timer effect
  useEffect(() => {
    if (!practiceModal.isTimerRunning || practiceModal.timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setPracticeModal((prev) => {
        const newTime = Math.max(0, prev.timeRemaining - 1);
        if (newTime === 0 && prev.isTimerRunning) {
          // Time is up, evaluate directly using the latest answer from 'prev'
          if (prev.question) {
            const qId = prev.question.id;
            const ans = prev.answerText;

            // Asynchronously start evaluation to avoid state update issues in setPracticeModal
            setTimeout(() => {
              setScores(s => ({ ...s, [qId]: { score: 0, feedback: "", state: "evaluating" } }));
              evaluateAnswer(qId, ans);
            }, 0);
          }
          return {
            ...prev,
            timeRemaining: 0,
            isTimerRunning: false,
          };
        }
        return {
          ...prev,
          timeRemaining: newTime,
          isTimerRunning: newTime > 0,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [practiceModal.isTimerRunning, practiceModal.timeRemaining]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const filtered = allQuestions.filter((q) => {
    if (selectedCategory !== "all" && q.category !== selectedCategory) return false;
    if (selectedDifficulty !== "all" && q.difficulty !== selectedDifficulty) return false;
    if (!isInTimeRange(q.estimatedTime, selectedTimeRange)) return false;
    if (search && !q.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categoryColor = (cat: InterviewType) => CATEGORIES.find((c) => c.value === cat)?.color || "";
  const difficultyColor = (d: Difficulty) => DIFFICULTIES.find((x) => x.value === d)?.color || "";

  return (
    <DashboardShell>
      <div className="space-y-6">
        <SlideIn>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Question Bank</h1>
            <p className="mt-1 text-sm text-zinc-500">{allQuestions.length} questions across {CATEGORIES.length} categories</p>
          </div>
        </SlideIn>

        {/* Filters */}
        <FadeIn delay={0.2} direction="up" className="relative">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions…"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100" />
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${showFilters
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {(selectedCategory !== "all" || selectedDifficulty !== "all" || selectedTimeRange !== "all") && (
                <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white font-bold">
                  {(selectedCategory !== "all" ? 1 : 0) + (selectedDifficulty !== "all" ? 1 : 0) + (selectedTimeRange !== "all" ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="absolute right-0 top-full z-40 mt-2 w-96 rounded-2xl border border-zinc-200 bg-white shadow-lg p-6 space-y-6">
              {/* Category Filter */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-700 mb-3">Question Type</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${selectedCategory === "all" ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
                  >
                    All Types
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${selectedCategory === cat.value ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Filter */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-700 mb-3">Difficulty</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedDifficulty("all")}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${selectedDifficulty === "all" ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
                  >
                    All Levels
                  </button>
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setSelectedDifficulty(d.value)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${selectedDifficulty === d.value ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Range Filter */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-700 mb-3">Time to Answer</h3>
                <div className="flex flex-wrap gap-2">
                  {timeRanges.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => setSelectedTimeRange(range.value)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${selectedTimeRange === range.value ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              <div className="border-t border-zinc-200 pt-4">
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedDifficulty("all");
                    setSelectedTimeRange("all");
                  }}
                  className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-50"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </FadeIn>

        {/* Results count */}
        <FadeIn delay={0.3} direction="up">
          <p className="text-xs text-zinc-400">{filtered.length} question{filtered.length !== 1 ? "s" : ""} found</p>
        </FadeIn>

        {/* Question Grid */}
        <FadeInStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((q) => (
            <FadeInStaggerItem key={q.id}>
              <div className="group h-full flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 transition-all duration-300 hover:border-zinc-300 hover:shadow-md hover:-translate-y-1">
                <div className="mb-3 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColor(q.category)}`}>{CATEGORIES.find((c) => c.value === q.category)?.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${difficultyColor(q.difficulty)}`}>{DIFFICULTIES.find((d) => d.value === q.difficulty)?.label}</span>
                </div>
                <p className="text-sm font-medium text-zinc-900 leading-relaxed flex-1">{q.text}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {q.estimatedTime}
                  </span>
                  <button onClick={() => openPracticeModal(q)} className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-all group-hover:opacity-100 hover:bg-zinc-700 hover:-translate-y-0.5">
                    {scores[q.id] ? "Practice Again" : "Practice"}
                  </button>
                </div>
              </div>
            </FadeInStaggerItem>
          ))}
        </FadeInStagger>

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-200 py-16 text-center">
            <p className="text-sm text-zinc-400">No questions match your filters.</p>
            <button onClick={() => { setSearch(""); setSelectedCategory("all"); setSelectedDifficulty("all"); }} className="mt-2 text-sm font-medium text-zinc-600 hover:text-zinc-900">Clear filters</button>
          </div>
        )}
      </div>

      {/* Practice Modal */}
      {
        practiceModal.isOpen && practiceModal.question && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-lg">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${categoryColor(practiceModal.question!.category)}`}>
                    {CATEGORIES.find((c) => c.value === practiceModal.question!.category)?.label}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${difficultyColor(practiceModal.question!.difficulty)}`}>
                    {DIFFICULTIES.find((d) => d.value === practiceModal.question!.difficulty)?.label}
                  </span>
                  <span className="flex items-center gap-1 rounded-lg bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Estimated: {practiceModal.question!.estimatedTime}
                  </span>
                </div>
                <button
                  onClick={closePracticeModal}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="space-y-6 px-6 py-6">
                {/* Question */}
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">{practiceModal.question.text}</h2>
                  <div className="mt-3 flex items-center gap-2">
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${practiceModal.timeRemaining <= 60 ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Time remaining: {formatTime(practiceModal.timeRemaining)}
                    </div>
                  </div>
                </div>

                {/* Answer Section */}
                <div className="space-y-4">
                  {scores[practiceModal.question.id] ? (
                    <div className="space-y-4">
                      {/* Read-only answer display */}
                      <div>
                        <label className="block text-sm font-medium text-zinc-900 mb-2">Your Answer</label>
                        <div className="h-32 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                          {practiceModal.answerText}
                        </div>
                      </div>

                      {/* Score Card */}
                      <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4">
                        {scores[practiceModal.question.id].state === "evaluating" ? (
                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-zinc-900">Evaluation Result</h3>
                            <div className="flex items-center gap-3 text-sm text-blue-600 font-medium animate-pulse">
                              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              Evaluating your answer...
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-zinc-900">Evaluation Result</h3>
                              <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-bold shadow-sm ${scores[practiceModal.question.id].score >= 70 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                                Score: {scores[practiceModal.question.id].score}/100
                              </span>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-zinc-200 shadow-sm">
                              <p className="text-sm text-zinc-600 leading-relaxed">
                                {scores[practiceModal.question.id].feedback}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-zinc-900 mb-2">Your Answer</label>
                        <textarea
                          value={practiceModal.answerText}
                          onChange={(e) => setPracticeModal((prev) => ({ ...prev, answerText: e.target.value }))}
                          placeholder="Type your answer here..."
                          className="h-48 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                        />
                      </div>

                      {/* Voice/Typing Options */}
                      <div className="flex gap-3">
                        <button
                          onClick={toggleRecording}
                          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${practiceModal.isRecording
                            ? "bg-red-100 text-red-600 hover:bg-red-200"
                            : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                            }`}
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                          </svg>
                          {practiceModal.isRecording ? "Stop Recording" : "Start Recording"}
                        </button>
                        <button
                          onClick={clearAnswer}
                          className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-50"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Clear Answer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-4">
                <button
                  onClick={closePracticeModal}
                  className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-50"
                >
                  Close
                </button>
                {!scores[practiceModal.question.id] ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!practiceModal.answerText.trim()}
                    className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Answer
                  </button>
                ) : scores[practiceModal.question.id].state === "completed" && (
                  <button
                    onClick={() => {
                      setScores(prev => {
                        const newScores = { ...prev };
                        delete newScores[practiceModal.question!.id];
                        return newScores;
                      });
                      setPracticeModal(prev => ({ ...prev, answerText: "", isTimerRunning: true, timeRemaining: getMinutesFromTime(prev.question!.estimatedTime) * 60 }));
                    }}
                    className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }
    </DashboardShell >
  );
}
