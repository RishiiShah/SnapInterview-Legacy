import { ReactNode } from "react";

/* ─────────────── Navigation ─────────────── */
export interface NavItem {
    label: string;
    href: string;
    icon: ReactNode;
}

export interface SearchItem {
    label: string;
    href: string;
    category: "Pages" | "Actions";
}

/* ─────────────── Notifications ─────────────── */
export interface Notification {
    id: number;
    title: string;
    message: string;
    time: string;
    read: boolean;
}

/* ─────────────── Dashboard Stats ─────────────── */
export interface StatCard {
    label: string;
    value: string;
    change: string;
    suffix?: string;
    icon: ReactNode;
}

/* ─────────────── Interviews ─────────────── */
export type InterviewType = "behavioral" | "technical" | "system-design" | "leadership";
export type Difficulty = "easy" | "medium" | "hard";

export interface InterviewSession {
    id: string;
    role: string;
    company: string;
    score: number;
    duration: string;
    date: string;
    status: "completed" | "in-progress" | "abandoned";
    type: InterviewType;
}

/* ─────────────── Questions ─────────────── */
export interface Question {
    id: number;
    slug: string;
    text: string;
    category: InterviewType;
    difficulty: Difficulty;
    estimatedTime: string;
    tags: string[];
    hint?: string;
    sampleAnswer?: string;
}

/* ─────────────── Analytics ─────────────── */
export interface ChartDataPoint {
    label: string;
    value: number;
}

export interface CategoryScore {
    category: string;
    score: number;
    total: number;
    color: string;
}

/* ─────────────── Settings ─────────────── */
export interface NotificationPreferences {
    emailNotifications: boolean;
    practiceReminders: boolean;
    weeklyReport: boolean;
    scoreAlerts: boolean;
}
