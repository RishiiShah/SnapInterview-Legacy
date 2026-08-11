import Link from "next/link";
import { SlideIn } from "@/components/ui/motion";
import RecordingsList from "@/components/recordings/RecordingsList";
import { interviewIdSchema } from "@/lib/interview/domain";
import { getServerAuthSession } from "@/lib/server-auth";
import {
  getCompletedSessionCardForUser,
  listCompletedSessionsForUser,
} from "@/repositories/interview-repo";

type RecordingsPageProps = {
  searchParams?: Promise<{ interviewId?: string }>;
};

export default async function RecordingsPage({ searchParams }: RecordingsPageProps) {
  const session = await getServerAuthSession();

  if (!session?.user?.email) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 pb-16 pt-2 xl:max-w-[88rem]">
        <SlideIn instant>
          <div>
            <h1 className="font-display text-[2rem] leading-[1.15] tracking-[-0.02em] text-[#F2F4F8] sm:text-[2.35rem]">
              Recordings
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#A8B0C2]">
              Review and manage your saved interview sessions.
            </p>
          </div>
        </SlideIn>
        <p className="py-12 text-center text-sm text-[#A8B0C2]">Please sign in to view recordings.</p>
      </div>
    );
  }

  const userId = session.user.id;
  const sp = searchParams ? await searchParams : undefined;
  const parsedDeepLinkId = interviewIdSchema.safeParse(sp?.interviewId);
  const deepLinkInterviewId = parsedDeepLinkId.success ? parsedDeepLinkId.data : null;
  const [sessionList, deepLinkedSession] = await Promise.all([
    listCompletedSessionsForUser({ userId, limit: 12, offset: 0 }),
    deepLinkInterviewId
      ? getCompletedSessionCardForUser({ userId, interviewId: deepLinkInterviewId })
      : Promise.resolve(null),
  ]);
  const sessions =
    deepLinkedSession && !sessionList.sessions.some((item) => item.id === deepLinkedSession.id)
      ? [deepLinkedSession, ...sessionList.sessions]
      : sessionList.sessions;
  const initialSessions = sessions.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16 pt-2 xl:max-w-[88rem]">
      <SlideIn instant>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[2rem] leading-[1.15] tracking-[-0.02em] text-[#F2F4F8] sm:text-[2.35rem]">
              Recordings
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#A8B0C2]">
              Per-session video, transcript, rubric, and question ratings. Trends and category averages
              are on{" "}
              <Link
                href="/analytics"
                className="text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
              >
                Analytics
              </Link>
              .
            </p>
          </div>
        </div>
      </SlideIn>

      <RecordingsList
        initialSessions={initialSessions}
        initialHasMore={sessionList.hasMore}
        initialNextCursor={sessionList.nextCursor ? {
          id: sessionList.nextCursor.id,
          createdAt: sessionList.nextCursor.createdAt.toISOString(),
        } : null}
        initialOpenInterviewId={deepLinkedSession?.id ?? null}
      />
    </div>
  );
}
