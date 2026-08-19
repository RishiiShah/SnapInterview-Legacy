import type { TranscriptEvaluationResponse } from "@/lib/interview/evaluation";
import type { InterviewType } from "@/lib/interview/domain";
import type {
  MetricsSessionRecord,
  TranscriptMetricRecord,
} from "@/repositories/interview-metrics-repo";

export type SessionRecord = MetricsSessionRecord & {
  _normalizedEvaluation?: TranscriptEvaluationResponse | null;
  _score?: number;
};

export type DashboardStat = {
  label: string;
  value: string;
  change: string;
  suffix?: string;
  iconKey: "completed" | "average" | "hours" | "streak";
};

export type DashboardRecentSession = {
  id: string;
  role: string;
  company: string;
  type: InterviewType | null;
  difficulty: string | null;
  /** Rubric score only — null when evaluation has not landed yet. */
  score: number | null;
  duration: string;
  date: string;
  videoKey: string | null;
};

export type DashboardChartPoint = {
  label: string;
  value: number;
};

export type PracticeRecentSession = {
  id: string;
  role: string;
  company: string;
  type: InterviewType;
  score: number;
  date: string;
  videoKey: string | null;
};

export type AnalyticsMonthlyComparison = {
  label: string;
  interviews: number;
  avgScore: number;
  hours: number;
};

export type AnalyticsCategoryScore = {
  category: string;
  score: number;
};

export type TranscriptRecord = TranscriptMetricRecord;

export type DashboardTypeBreakdown = {
  type: InterviewType;
  label: string;
  count: number;
  avgScore: number | null;
  lastScore: number | null;
  recentScores: number[];
};

export type SubScores = {
  communication: number | null;
  technicalDepth: number | null;
  clarity: number | null;
};

export type WeeklySubScoreTrends = {
  communication: DashboardChartPoint[];
  technicalDepth: DashboardChartPoint[];
  clarity: DashboardChartPoint[];
};

export type FeedbackStats = {
  total: number;
  thumbsUp: number;
  thumbsDown: number;
};

export type PeriodComparison = {
  currentSessions: number;
  previousSessions: number;
  currentAvg: number | null;
  previousAvg: number | null;
  scoreDelta: number | null;
  scoreDeltaPct: number | null;
  summary: string;
};

export type AnalyticsTrendPoint = {
  label: string;
  /** Average rubric score for the bucket; null when no interviews in the period. */
  avgScore: number | null;
  sessionCount: number;
};

export type SubScoreTrendSets = {
  daily: WeeklySubScoreTrends;
  weekly: WeeklySubScoreTrends;
  monthly: WeeklySubScoreTrends;
};

export type DashboardOverviewData = {
  stats: DashboardStat[];
  recentSessions: DashboardRecentSession[];
  chartData: DashboardChartPoint[];
  byType: DashboardTypeBreakdown[];
  subScores: SubScores;
  topStrength: string | null;
  topFocus: string | null;
};

export type AnalyticsOverviewData = {
  weeklyScores: DashboardChartPoint[];
  dailyTrend: AnalyticsTrendPoint[];
  weeklyTrend: AnalyticsTrendPoint[];
  monthlyTrend: AnalyticsTrendPoint[];
  subScoreTrends: SubScoreTrendSets;
  monthlyComparison: AnalyticsMonthlyComparison[];
  periodComparison: PeriodComparison;
  categoryBreakdown: AnalyticsCategoryScore[];
  strengths: string[];
  improvements: string[];
  subScores: SubScores;
  totalSessions: number;
  feedbackStats: FeedbackStats;
};
