import { ReactNode } from "react";
import type {
    Difficulty,
    InterviewType,
} from "@/lib/interview/domain";

export type { Difficulty, InterviewPersona, InterviewType } from "@/lib/interview/domain";

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
    id: string;
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
    type?: "text" | "coding";
    description?: string;
    constraints?: string;
    starterCode?: Record<string, string>;
    testCases?: Array<{ input: string; expectedOutput: string; isHidden: boolean }>;
    solutionCode?: Record<string, string>;
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
