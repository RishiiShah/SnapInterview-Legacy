
import { SlideIn } from "@/components/ui/motion";
import RecordingsList from "@/components/recordings/RecordingsList";
import { interviewIdSchema } from "@/lib/interview/domain";
import { getServerAuthSession } from "@/lib/server-auth";
import { getCompletedSessionCardForUser, listCompletedSessionsForUser } from "@/repositories/interview-repo";

type RecordingsPageProps = {
  searchParams?: Promise<{ interviewId?: string }>;
};

export default async function RecordingsPage({ searchParams }: RecordingsPageProps) {
  const session = await getServerAuthSession();

  if (!session?.user?.email) {
    return (
      <>
        <div className="space-y-8 pb-8">
          <SlideIn>
            <div>
              <h1 className="font-display text-2xl tracking-tight text-[#F2F4F8]">Recordings</h1>
              <p className="mt-1 text-sm text-[#A8B0C2]">Review and manage your saved interview sessions.</p>
            </div>
          </SlideIn>
          <div className="rounded-xl border border-dashed border-white/[0.08] py-12 text-center text-sm text-[#A8B0C2]">
            Please sign in to view recordings.
          </div>
        </div>
      </>
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
  const sessions = deepLinkedSession && !sessionList.sessions.some((item) => item.id === deepLinkedSession.id)
    ? [deepLinkedSession, ...sessionList.sessions]
    : sessionList.sessions;
  const initialSessions = sessions.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));

  return (
    <>
      <div className="space-y-8 pb-8">
        <SlideIn>
          <div>
            <h1 className="font-display text-2xl tracking-tight text-[#F2F4F8]">Recordings</h1>
            <p className="mt-1 text-sm text-[#A8B0C2]">Review and manage your saved interview sessions.</p>
          </div>
        </SlideIn>

        <RecordingsList
          initialSessions={initialSessions}
          initialHasMore={sessionList.hasMore}
          initialOpenInterviewId={deepLinkedSession?.id ?? null}
        />
      </div>
    </>
  );
}
