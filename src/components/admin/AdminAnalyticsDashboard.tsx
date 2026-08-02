import { AdminUserBaseLineChart } from "@/components/admin/AdminUserBaseLineChart";
import {
  adminHeadingClass,
  adminMutedClass,
  adminPanelClass,
  adminPanelInsetClass,
} from "./admin-styles";

type UserBasePoint = {
  label: string;
  axisLabel: string;
  totalUsers: number;
};

type FunnelItem = {
  label: string;
  value: number;
};

type RetentionSnapshot = {
  label: string;
  value: string;
  hint: string;
};

type AiHealthCard = {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "warn" | "danger" | "good";
};

type AdminAnalyticsDashboardProps = {
  userBase: UserBasePoint[];
  funnel: FunnelItem[];
  retention: RetentionSnapshot[];
  aiHealthCards: AiHealthCard[];
  averageScore: number | null;
  subScores: {
    communication: number | null;
    technicalDepth: number | null;
    clarity: number | null;
  };
};

function toneClass(tone: AiHealthCard["tone"]) {
  switch (tone) {
    case "good":
      return "border-emerald-500/25 bg-emerald-500/10";
    case "warn":
      return "border-amber-500/25 bg-amber-500/10";
    case "danger":
      return "border-red-500/25 bg-red-500/10";
    default:
      return "border-white/[0.08] bg-white/[0.02]";
  }
}

export default function AdminAnalyticsDashboard({
  userBase,
  funnel,
  retention,
  aiHealthCards,
  averageScore,
  subScores,
}: AdminAnalyticsDashboardProps) {
  const funnelBase = Math.max(1, funnel[0]?.value ?? 1);
  const latestTotalUsers = userBase[userBase.length - 1]?.totalUsers;

  return (
    <div className="space-y-6 pb-8">
      <section>
        <h2 className={adminHeadingClass}>Analytics</h2>
        <p className={`mt-1 ${adminMutedClass}`}>
          Product growth, interview funnel, retention, and AI evaluation health.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className={`${adminPanelClass} p-5`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#F2F4F8]">Total User Base</h3>
              <p className="text-xs text-[#A8B0C2]">Last 14 days</p>
            </div>
            {latestTotalUsers != null ? (
              <p className="text-lg font-semibold text-[#F2F4F8]">
                {latestTotalUsers.toLocaleString()}
                <span className="ml-1 text-xs font-normal text-[#A8B0C2]">users today</span>
              </p>
            ) : null}
          </div>
          <AdminUserBaseLineChart data={userBase} />
        </div>

        <div className={`${adminPanelClass} p-5`}>
          <h3 className="text-sm font-semibold text-[#F2F4F8]">Completion Funnel</h3>
          <p className="text-xs text-[#A8B0C2]">
            Active records only, showing drop-offs per stage.
          </p>
          <div className="mt-4 space-y-3">
            {funnel.map((item) => {
              const pct = Math.round((item.value / funnelBase) * 100);
              return (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#C5CBD8]">{item.label}</span>
                    <span className="text-[#A8B0C2]">
                      {item.value.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-[#3B82F6]"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className={`${adminPanelClass} p-5`}>
        <h3 className="text-sm font-semibold text-[#F2F4F8]">Retention Snapshot</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {retention.map((card) => (
            <div key={card.label} className={`${adminPanelInsetClass} p-4`}>
              <p className="text-xs uppercase tracking-wide text-[#A8B0C2]">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#F2F4F8]">{card.value}</p>
              <p className="mt-1 text-xs text-[#A8B0C2]">{card.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className={`${adminPanelClass} p-5`}>
          <h3 className="text-sm font-semibold text-[#F2F4F8]">Interview Quality</h3>
          <p className="mt-3 text-sm text-[#A8B0C2]">
            Average score:{" "}
            <span className="font-semibold text-[#F2F4F8]">{averageScore ?? "N/A"}</span>
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              { label: "Communication", value: subScores.communication },
              { label: "Technical", value: subScores.technicalDepth },
              { label: "Clarity", value: subScores.clarity },
            ].map((item) => (
              <div key={item.label} className={`${adminPanelInsetClass} p-3`}>
                <p className="text-[11px] text-[#A8B0C2]">{item.label}</p>
                <p className="mt-1 text-xl font-semibold text-[#F2F4F8]">{item.value ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={`${adminPanelClass} p-5`}>
          <h3 className="text-sm font-semibold text-[#F2F4F8]">AI Health</h3>
          <div className="mt-3 space-y-3">
            {aiHealthCards.map((card) => (
              <div key={card.label} className={`rounded-xl border p-3 ${toneClass(card.tone)}`}>
                <p className="text-xs uppercase tracking-wide text-[#A8B0C2]">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-[#F2F4F8]">{card.value}</p>
                <p className="mt-1 text-xs text-[#A8B0C2]">{card.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
