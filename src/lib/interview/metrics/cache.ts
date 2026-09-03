import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { env } from "@/lib/env";
import { getDashboardOverviewDataUncached } from "./dashboard";
import { getAnalyticsOverviewDataUncached } from "./analytics";
import type { DashboardOverviewData, AnalyticsOverviewData } from "./types";

export const DASHBOARD_CACHE_TAG = "interview-dashboard-metrics-v1";
export const ANALYTICS_CACHE_TAG = "interview-analytics-metrics-v2";

export function isTestEnv(): boolean {
  return env.NODE_ENV === "test";
}

export function getDashboardCacheTag(userId: string): string {
  return `${DASHBOARD_CACHE_TAG}:${userId}`;
}

export function getAnalyticsCacheTag(userId: string): string {
  return `${ANALYTICS_CACHE_TAG}:${userId}`;
}

export function invalidateInterviewMetricsCache(userId: string): void {
  if (isTestEnv()) return;
  revalidateTag(getDashboardCacheTag(userId), "max");
  revalidateTag(getAnalyticsCacheTag(userId), "max");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

export function invalidateAllInterviewMetricsCaches(): void {
  if (isTestEnv()) return;
  revalidateTag(DASHBOARD_CACHE_TAG, "max");
  revalidateTag(ANALYTICS_CACHE_TAG, "max");
}

export function getDashboardOverviewData(userId: string): Promise<DashboardOverviewData> {
  return isTestEnv()
    ? getDashboardOverviewDataUncached(userId)
    : unstable_cache(
        () => getDashboardOverviewDataUncached(userId),
        ["dashboard-overview-v1", userId],
        { revalidate: 300, tags: [DASHBOARD_CACHE_TAG, getDashboardCacheTag(userId)] },
      )();
}

export function getAnalyticsOverviewData(userId: string): Promise<AnalyticsOverviewData> {
  return isTestEnv()
    ? getAnalyticsOverviewDataUncached(userId)
    : unstable_cache(
        () => getAnalyticsOverviewDataUncached(userId),
        ["analytics-overview-v2", userId],
        { revalidate: 300, tags: [ANALYTICS_CACHE_TAG, getAnalyticsCacheTag(userId)] },
      )();
}
