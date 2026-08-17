import { NavItem, SearchItem, Difficulty, InterviewType, InterviewPersona, QuestionCategory } from "./types";
import { INTERVIEW_TYPE_META, INTERVIEW_TYPE_VALUES } from "@/lib/interview/domain";

/* ─────────────── Navigation Items ─────────────── */
export const NAV_ITEMS: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: null },
    { label: "Practice", href: "/practice", icon: null },
    { label: "Question Bank", href: "/questions", icon: null },
    { label: "Coding", href: "/coding", icon: null },
    { label: "Analytics", href: "/analytics", icon: null },
    { label: "Recordings", href: "/recordings", icon: null },
    { label: "Settings", href: "/settings", icon: null },
];
// Note: icons are set in Sidebar.tsx since they're JSX — constants only stores the data

/* ─────────────── Searchable Items ─────────────── */
export const SEARCH_ITEMS: SearchItem[] = [
    { label: "Dashboard", href: "/dashboard", category: "Pages" },
    { label: "Practice Interview", href: "/practice", category: "Pages" },
    { label: "Question Bank", href: "/questions", category: "Pages" },
    { label: "Coding", href: "/coding", category: "Pages" },
    { label: "Analytics", href: "/analytics", category: "Pages" },
    { label: "Recordings", href: "/recordings", category: "Pages" },
    { label: "Settings", href: "/settings", category: "Pages" },
    { label: "Start New Interview", href: "/practice", category: "Actions" },
    { label: "Change Password", href: "/settings", category: "Actions" },
    { label: "View Score Trends", href: "/analytics", category: "Actions" },
    { label: "Review Recordings", href: "/recordings", category: "Actions" },
];

/* ─────────────── Categories & Difficulty ─────────────── */
/** Question-bank filter categories (prompts), not live interview kinds. */
export const CATEGORIES: { value: QuestionCategory; label: string; color: string }[] = [
    { value: "behavioral", label: "Behavioral", color: "bg-blue-100 text-blue-700" },
    { value: "technical", label: "Technical", color: "bg-violet-100 text-violet-700" },
    { value: "system-design", label: "System Design", color: "bg-amber-100 text-amber-700" },
    { value: "leadership", label: "Leadership", color: "bg-emerald-100 text-emerald-700" },
];

/** Live mock interview kinds — real hiring-loop shapes. */
export const INTERVIEW_KINDS: {
    value: InterviewType;
    label: string;
    shortLabel: string;
    description: string;
}[] = INTERVIEW_TYPE_VALUES.map((value) => ({
    value,
    label: INTERVIEW_TYPE_META[value].label,
    shortLabel: INTERVIEW_TYPE_META[value].shortLabel,
    description: INTERVIEW_TYPE_META[value].description,
}));

export const DIFFICULTIES: { value: Difficulty; label: string; color: string }[] = [
    { value: "easy", label: "Easy", color: "bg-green-100 text-green-700" },
    { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-700" },
    { value: "hard", label: "Hard", color: "bg-red-100 text-red-700" },
];

export const EXPERIENCE_LEVELS = [
    { value: "entry-level", label: "Intern / Entry Level" },
    { value: "mid-level", label: "Mid Level" },
    { value: "senior", label: "Senior" },
    { value: "staff-plus", label: "Staff+ / Lead" },
];

export const INTERVIEW_FORMAT_OPTIONS: {
    value: 5 | 10 | 15;
    label: string;
    shortLabel: string;
    description: string;
}[] = [
    { value: 5, label: "Quick Screen (~15 min)", shortLabel: "15m Screen", description: "High-level alignment & initial domain probe" },
    { value: 10, label: "Technical Round (~30 min)", shortLabel: "30m Round", description: "2 core topic pillars with dynamic follow-ups" },
    { value: 15, label: "Onsite Deep Dive (~45 min)", shortLabel: "45m Deep Dive", description: "Multi-pillar architecture & scaling stress tests" },
];

export const INTERVIEW_GOALS = [
    { value: "land-first-role", label: "Land my first role" },
    { value: "switch-companies", label: "Switch companies" },
    { value: "prepare-for-promo", label: "Prepare for promotion" },
    { value: "sharpen-communication", label: "Sharpen communication" },
];

export const INTERVIEW_PERSONAS: { value: InterviewPersona; label: string; description: string }[] = [
    { value: "friendly", label: "Friendly Coach", description: "Warmer tone, confidence building, clear nudges." },
    { value: "balanced", label: "Balanced Interviewer", description: "Default interviewer with realistic pacing and mixed follow-ups." },
    { value: "strict", label: "Strict Panel", description: "Higher pressure, sharper follow-ups, more direct challenge." },
];

/* ─────────────── Modern Tech Roles Taxonomy ─────────────── */
export const ROLES: string[] = [
    // Software Engineering
    "Software Engineer",
    "Software Engineer - Frontend",
    "Software Engineer - Backend",
    "Software Engineer - Full Stack",
    "Software Engineer - Mobile (iOS/Android)",
    "Software Engineer - iOS",
    "Software Engineer - Android",
    "Software Engineer - Systems & Infrastructure",
    "Software Engineer - Embedded & Firmware",
    "Software Engineer in Test (SDET)",
    // Cloud, Reliability & Security
    "Site Reliability Engineer (SRE)",
    "DevOps / Cloud Engineer",
    "Platform / Infrastructure Engineer",
    "Security Engineer",
    "Solutions Architect",
    // AI, Machine Learning & Data
    "Machine Learning Engineer",
    "AI / LLM Applications Engineer",
    "Data Engineer",
    "Data Scientist",
    "Analytics Engineer",
    "AI Research Scientist",
    // Quantitative Finance & Trading
    "Quantitative Developer",
    "Quantitative Researcher",
    "Quantitative Trader",
    // Product & Design
    "Product Manager",
    "Technical Product Manager (TPM)",
    "Product Designer",
    "Design Engineer",
    // Engineering Leadership
    "Engineering Manager",
    "Tech Lead / Staff Engineer",
];

/* ─────────────── Companies ─────────────── */
export const COMPANIES: string[] = [
    "General",
    "Google",
    "Meta",
    "Amazon",
    "Apple",
    "Microsoft",
    "Netflix",
    "Tesla",
    "Twitter/X",
    "Discord",
    "Stripe",
    "Airbnb",
    "Uber",
    "Lyft",
    "Spotify",
    "Dropbox",
    "Slack",
    "GitHub",
    "GitLab",
    "MongoDB",
    "Redis",
    "Shopify",
    "Square",
    "PayPal",
    "Twilio",
    "Figma",
    "Notion",
    "Linear",
    "Retool",
    "Vercel",
    "Netlify",
    "IBM",
    "Oracle",
    "Salesforce",
    "SAP",
    "Cisco",
    "Intel",
    "Adobe",
    "Zoom",
    "Atlassian",
    "JetBrains",
    "HashiCorp",
    "Datadog",
    "Elastic",
];
