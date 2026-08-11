import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/server-auth";
import { getInterviewSessionState } from "@/services/interview-service";
import InterviewPageClient from "./InterviewPageClient";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const [session, { uuid: interviewId }] = await Promise.all([
    getServerAuthSession(),
    params,
  ]);
  const userId = session?.user?.id ?? session?.session?.userId;

  if (!userId) {
    redirect("/login");
  }

  const interview = await getInterviewSessionState({ interviewId, userId });
  const initialSessionMeta = interview
    ? {
        id: interview.id,
        questionCount: interview.questionCount,
        persona: interview.persona,
        type: interview.type,
      }
    : undefined;

  return <InterviewPageClient initialSessionMeta={initialSessionMeta} />;
}
