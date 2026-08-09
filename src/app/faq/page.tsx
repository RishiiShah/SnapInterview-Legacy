"use client";

import { useState } from "react";
import Link from "next/link";
import { AppLogo } from "@/components/ui/AppLogo";
import { useSession } from "@/lib/auth-client";
import {
  IconSearch,
  IconChevronDown,
  IconMessage,
  IconCode,
  IconShield,
  IconUser,
  IconArrowRight,
  IconChartBars,
  IconQuestionBank,
} from "@/components/ui/icons";
import LandingFooter from "@/components/landing/LandingFooter";

type FAQItem = {
  id: string;
  category: "getting-started" | "interviews" | "coding" | "questions" | "analytics" | "security";
  question: string;
  answer: string;
};

const FAQ_DATA: FAQItem[] = [
  // 1. Getting Started (4 items)
  {
    id: "faq-1",
    category: "getting-started",
    question: "What is SnapInterview and how does it work?",
    answer:
      "SnapInterview is an AI-powered mock interview and technical practice platform built for software engineers. It combines voice-based AI interviewers with a real coding environment to give you realistic practice sessions.\n\nYou pick your role like Frontend, Backend, Fullstack, System Design, or Algorithms, choose your difficulty, and start immediately. Right after your session, you get clear score breakdowns, transcripts, and actionable recommendations to improve.",
  },
  {
    id: "faq-2",
    category: "getting-started",
    question: "Do I need an account to view FAQs and documentation?",
    answer:
      "No, everything in the FAQ and documentation is free to browse without logging in. You only need an account when launching live mock interviews, executing code in the workspace, saving recordings, or opening support tickets.",
  },
  {
    id: "faq-3",
    category: "getting-started",
    question: "What browser and hardware requirements do I need?",
    answer:
      "SnapInterview runs directly in modern desktop and mobile browsers like Google Chrome, Mozilla Firefox, Apple Safari, and Microsoft Edge. For AI voice interviews, a working microphone is required. A webcam is optional if you want to view your local video stream during practice.",
  },
  {
    id: "faq-4",
    category: "getting-started",
    question: "How do I create an account or sign in?",
    answer:
      "Click Sign In or Get Started at the top right of any page. You can register using your email address with a 6-digit OTP verification code or sign in using social auth.",
  },

  // 2. AI Mock Interviews (4 items)
  {
    id: "faq-5",
    category: "interviews",
    question: "How do AI mock interviews simulate real technical interviews?",
    answer:
      "Our AI interviewer acts like a senior software engineer. It asks role-specific technical questions, listens as you verbally explain your solution, and asks probing follow-up questions when edge cases or constraints are missing. It adapts to your pace, providing subtle hints if you get stuck or adding extra technical constraints if you perform well.",
  },
  {
    id: "faq-6",
    category: "interviews",
    question: "Can I customize the interview role, seniority, and focus areas?",
    answer:
      "Yes. You can select your targeted role (e.g. Senior Frontend Engineer, Staff Backend Developer, Distributed Systems Architect), pick specific topic tags like React, Node.js, SQL, or Dynamic Programming, and supply custom interview prompts or resume highlights.",
  },
  {
    id: "faq-7",
    category: "interviews",
    question: "How does speech recognition and text-to-speech work?",
    answer:
      "As you speak into your microphone, your spoken response is transcribed in real-time. When the AI responds, synthetic speech is streamed to your speakers with natural conversational pacing.",
  },
  {
    id: "faq-8",
    category: "interviews",
    question: "How are interview performance and scores calculated?",
    answer:
      "At the end of your session, the AI evaluates your interview across Technical Accuracy (40%), Problem-Solving Structure (30%), Communication Clarity (20%), and Edge Case Awareness (10%). You receive a score out of 100, bulleted strengths, and line-by-line feedback.",
  },

  // 3. Coding Workspace & Sandbox (4 items)
  {
    id: "faq-9",
    category: "coding",
    question: "What programming languages are supported in the coding workspace?",
    answer:
      "The coding workspace supports JavaScript (Node.js), TypeScript, Python 3, C++ (GCC), Java, and Go. Each language environment includes standard library support and automated unit test runners.",
  },
  {
    id: "faq-10",
    category: "coding",
    question: "Is code execution isolated and safe?",
    answer:
      "Yes. All code submissions execute inside short-lived container sandboxes with strict CPU, memory, and runtime execution limits.",
  },
  {
    id: "faq-11",
    category: "coding",
    question: "Can I write and test custom test cases?",
    answer:
      "Yes. In addition to default problem test cases, you can add custom inputs and execute your code against custom test cases directly inside the IDE workspace.",
  },
  {
    id: "faq-12",
    category: "coding",
    question: "What IDE features are included in the workspace?",
    answer:
      "The Monaco-based editor includes syntax highlighting, line numbers, code folding, dark mode themes, auto-closing brackets, and customizable tab indentation.",
  },

  // 4. Question Bank (4 items)
  {
    id: "faq-13",
    category: "questions",
    question: "How many questions are available in the Question Bank?",
    answer:
      "The Question Bank contains real technical interview questions sourced from top engineering companies (Google, Meta, Amazon, Apple, Netflix, Microsoft). Problems cover algorithmic fundamentals, data structures, and system design.",
  },
  {
    id: "faq-14",
    category: "questions",
    question: "How can I filter questions to target weak areas?",
    answer:
      "Filter questions by difficulty (Easy, Medium, Hard), topic category (Arrays, Trees, Graphs, System Design), company tag, or popularity.",
  },
  {
    id: "faq-15",
    category: "questions",
    question: "Can I submit custom answers for instant AI evaluation?",
    answer:
      "Yes. On any question detail page, you can type your conceptual response or code solution and click Evaluate Answer to receive instant feedback on correctness, edge cases, and time complexity.",
  },
  {
    id: "faq-15b",
    category: "questions",
    question: "Are system design and architecture problems included?",
    answer:
      "Yes. The Question Bank includes dedicated sections for Object-Oriented Design (OOD) and High-Level System Design, complete with architectural prompts and scaling considerations.",
  },

  // 5. Analytics & Recordings (4 items)
  {
    id: "faq-16",
    category: "analytics",
    question: "Where are past interview recordings and feedback reports stored?",
    answer:
      "All completed interviews are automatically saved under your Recordings and Analytics dashboard tabs so you can replay audio and read transcripts anytime.",
  },
  {
    id: "faq-17",
    category: "analytics",
    question: "Can I export or share interview feedback reports?",
    answer:
      "Yes. You can generate a shareable feedback link or export a summary report to share with mentors or recruiters.",
  },
  {
    id: "faq-18",
    category: "analytics",
    question: "How does score tracking help me improve over time?",
    answer:
      "Analytics tracks your average scores over time across domains so you can monitor your growth and focus practice on weaker areas.",
  },
  {
    id: "faq-18b",
    category: "analytics",
    question: "Can I replay audio and view verbatim transcripts?",
    answer:
      "Yes. Every session recording includes full audio playback controls alongside a synchronized, searchable verbatim transcript of the entire interview.",
  },

  // 6. Security, Privacy & Support (4 items)
  {
    id: "faq-19",
    category: "security",
    question: "Is my personal data or audio sold or used for AI training?",
    answer:
      "No. Audio, code solutions, transcripts, and personal data are encrypted using AES-256 at rest and TLS 1.3 in transit. We never sell your personal information or use private candidate sessions to train public models.",
  },
  {
    id: "faq-20",
    category: "security",
    question: "How do I delete my account or purge personal data?",
    answer:
      "You can permanently delete your account and all associated recordings and metrics anytime under Settings > Security in your user dashboard.",
  },
  {
    id: "faq-21",
    category: "security",
    question: "How do I submit a support ticket or report a bug?",
    answer:
      "If you experience a technical issue or have a question, visit our Help & Support page (/support). Logged-in users can submit a support ticket with an optional screenshot attachment.",
  },
  {
    id: "faq-21b",
    category: "security",
    question: "How are account credentials and passwords secured?",
    answer:
      "Passwords are hashed securely using credential encryption. Session authentication is managed via secure HTTP-only cookies protected by strict Content Security Policy (CSP) headers.",
  },
];

const CATEGORY_GROUPS = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: IconUser,
    desc: "Platform overview, account setup, and browser requirements",
  },
  {
    id: "interviews",
    title: "AI Mock Interviews",
    icon: IconMessage,
    desc: "Voice processing, role targeting, and automated scoring",
  },
  {
    id: "coding",
    title: "Coding Workspace",
    icon: IconCode,
    desc: "Supported languages, sandboxed runner, and IDE features",
  },
  {
    id: "questions",
    title: "Question Bank",
    icon: IconQuestionBank,
    desc: "Company tags, problem difficulty, and AI answer evaluation",
  },
  {
    id: "analytics",
    title: "Recordings & Metrics",
    icon: IconChartBars,
    desc: "Audio replays, verbatim transcripts, and score tracking",
  },
  {
    id: "security",
    title: "Privacy & Security",
    icon: IconShield,
    desc: "Data encryption, account deletion, and support tickets",
  },
] as const;

export default function FAQPage() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isLoggedIn = Boolean(session?.user);

  const isFiltering = searchQuery.trim() !== "" || selectedCategoryFilter !== null;

  const filteredFaqs = FAQ_DATA.filter((faq) => {
    const matchesCategory =
      selectedCategoryFilter === null || faq.category === selectedCategoryFilter;
    const matchesSearch =
      searchQuery.trim() === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleAccordion = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F5F7FF] flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#090A0F]/80 px-4 backdrop-blur-md sm:px-8 lg:px-12">
        <Link
          href={isLoggedIn ? "/dashboard" : "/"}
          prefetch={false}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <AppLogo size={28} className="rounded-md" priority />
          <span className="text-sm font-semibold tracking-tight text-white">
            Snap<span className="text-blue-400">Interview</span>
          </span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/support"
            prefetch={false}
            className="text-xs font-medium text-[#CBD5E1] transition-colors hover:text-white"
          >
            Help & Support
          </Link>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              prefetch={false}
              className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-blue-500"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                prefetch={false}
                className="text-xs font-medium text-[#CBD5E1] transition-colors hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                prefetch={false}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-blue-500"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Main Content Area - Full max-w-7xl Desktop Width */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-10 sm:px-6 lg:px-8 space-y-10">
        {/* Title Header */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-[#CBD5E1] max-w-xl mx-auto leading-relaxed">
            Everything you need to know about AI mock interviews, coding workspace, privacy, and account configuration.
          </p>

          {/* Search Bar with Crisp High-Contrast Placeholder */}
          <div className="relative max-w-lg mx-auto pt-2">
            <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8] pt-1" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions, topics, or features..."
              className="w-full rounded-xl border border-white/[0.1] bg-[#12141A] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-[#94A3B8] outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Active Filter Header if searching/filtering */}
        {isFiltering ? (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h2 className="text-sm font-semibold text-white">
                {selectedCategoryFilter
                  ? `Category: ${CATEGORY_GROUPS.find((g) => g.id === selectedCategoryFilter)?.title}`
                  : `Search Results (${filteredFaqs.length})`}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategoryFilter(null);
                }}
                className="text-xs text-blue-400 hover:underline cursor-pointer"
              >
                Clear Search Filters
              </button>
            </div>

            <div className="space-y-3">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq) => {
                  const isOpen = expandedId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleAccordion(faq.id)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer hover:bg-white/[0.02]"
                      >
                        <span className="text-xs sm:text-sm font-medium text-white">{faq.question}</span>
                        <IconChevronDown
                          className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-blue-400" : ""
                          }`}
                        />
                      </button>
                      {isOpen ? (
                        <div className="px-5 pb-5 text-xs sm:text-sm leading-relaxed text-[#CBD5E1] border-t border-white/[0.06] pt-3.5 whitespace-pre-line">
                          {faq.answer}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                  <p className="text-sm text-[#CBD5E1]">No matching questions found.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Perfectly Symmetric 3-Column Topic Category Grid (4 items per card) */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {CATEGORY_GROUPS.map((group) => {
              const categoryFaqs = FAQ_DATA.filter((faq) => faq.category === group.id);
              const Icon = group.icon;

              return (
                <div
                  key={group.id}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col justify-between h-full transition-colors hover:border-white/[0.14]"
                >
                  <div className="space-y-4">
                    {/* Category Header */}
                    <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-white">{group.title}</h2>
                        <p className="text-[11px] text-[#94A3B8]">{group.desc}</p>
                      </div>
                    </div>

                    {/* Questions List (4 items per card) */}
                    <div className="space-y-2.5 pt-1">
                      {categoryFaqs.map((faq) => {
                        const isOpen = expandedId === faq.id;
                        return (
                          <div key={faq.id} className="rounded-lg bg-white/[0.01] border border-white/[0.04]">
                            <button
                              type="button"
                              onClick={() => toggleAccordion(faq.id)}
                              className="flex w-full items-center justify-between gap-2 p-3 text-left cursor-pointer hover:bg-white/[0.02]"
                            >
                              <span className="text-xs font-medium text-[#F8FAFC] leading-snug">{faq.question}</span>
                              <IconChevronDown
                                className={`h-3.5 w-3.5 shrink-0 text-[#94A3B8] transition-transform duration-200 ${
                                  isOpen ? "rotate-180 text-blue-400" : ""
                                }`}
                              />
                            </button>
                            {isOpen ? (
                              <div className="px-3 pb-3 text-xs leading-relaxed text-[#CBD5E1] border-t border-white/[0.04] pt-2 whitespace-pre-line">
                                {faq.answer}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category Filter Button */}
                  <div className="pt-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter(group.id)}
                      className="text-xs font-medium text-[#94A3B8] hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      Filter by this category →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Still Have Questions CTA Section */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0C0F1A] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white sm:text-base">Still have questions?</h3>
            <p className="mt-1 text-xs text-[#CBD5E1]">
              Can&apos;t find what you&apos;re looking for? Reach out to our engineering support team directly.
            </p>
          </div>
          <Link
            href="/support"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-all hover:bg-blue-500 shrink-0"
          >
            <span>Contact Support</span>
            <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
