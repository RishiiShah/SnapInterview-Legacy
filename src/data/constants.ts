import { NavItem, SearchItem, Notification, Difficulty, InterviewType } from "./types";

/* ─────────────── Navigation Items ─────────────── */
export const NAV_ITEMS: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: null },
    { label: "Practice", href: "/practice", icon: null },
    { label: "Question Bank", href: "/questions", icon: null },
    { label: "Analytics", href: "/analytics", icon: null },
    { label: "Settings", href: "/settings", icon: null },
];
// Note: icons are set in Sidebar.tsx since they're JSX — constants only stores the data

/* ─────────────── Searchable Items ─────────────── */
export const SEARCH_ITEMS: SearchItem[] = [
    { label: "Dashboard", href: "/dashboard", category: "Pages" },
    { label: "Practice Interview", href: "/practice", category: "Pages" },
    { label: "Question Bank", href: "/questions", category: "Pages" },
    { label: "Analytics", href: "/analytics", category: "Pages" },
    { label: "Settings", href: "/settings", category: "Pages" },
    { label: "Start New Interview", href: "/practice", category: "Actions" },
    { label: "Change Password", href: "/settings", category: "Actions" },
    { label: "View Score Trends", href: "/analytics", category: "Actions" },
];

/* ─────────────── Categories & Difficulty ─────────────── */
export const CATEGORIES: { value: InterviewType; label: string; color: string }[] = [
    { value: "behavioral", label: "Behavioral", color: "bg-blue-100 text-blue-700" },
    { value: "technical", label: "Technical", color: "bg-purple-100 text-purple-700" },
    { value: "system-design", label: "System Design", color: "bg-amber-100 text-amber-700" },
    { value: "leadership", label: "Leadership", color: "bg-emerald-100 text-emerald-700" },
];

export const DIFFICULTIES: { value: Difficulty; label: string; color: string }[] = [
    { value: "easy", label: "Easy", color: "bg-green-100 text-green-700" },
    { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-700" },
    { value: "hard", label: "Hard", color: "bg-red-100 text-red-700" },
];

/* ─────────────── Default Notifications ─────────────── */
export const DEFAULT_NOTIFICATIONS: Notification[] = [
    { id: 1, title: "Practice streak! 🔥", message: "You've practiced 5 days in a row. Keep it up!", time: "2m ago", read: false },
    { id: 2, title: "New questions added", message: "15 new System Design questions are available.", time: "1h ago", read: false },
    { id: 3, title: "Score milestone", message: "Congrats! You scored 90+ on your last 3 interviews.", time: "3h ago", read: false },
    { id: 4, title: "Weekly report ready", message: "Your analytics for this week have been updated.", time: "1d ago", read: true },
    { id: 5, title: "Tip of the day", message: "Use the STAR method for behavioral questions.", time: "2d ago", read: true },
];
