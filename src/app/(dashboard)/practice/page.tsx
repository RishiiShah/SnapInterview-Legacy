import PracticePageClient from "@/components/practice/PracticePageClient";
import { extractInterviewIdFromVideoKey } from "@/lib/interview/recordings";
import { getRecentPracticeSessionsByUserId } from "@/lib/interview/metrics";
import { parsePracticeRetakeDefaults, type PracticeRetakeSearchParams } from "@/lib/practice/retake-defaults";
import { listUserVideos } from "@/lib/s3/videos";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { redirect } from "next/navigation";

type PracticePageProps = {
  searchParams?: Promise<PracticeRetakeSearchParams>;
};

export default async function PracticePage({ searchParams }: PracticePageProps) {
  const identity = await getSessionUserIdentity();

  if (!identity) {
    redirect("/login");
  }

  const retakeDefaults = parsePracticeRetakeDefaults(await searchParams);
  const practiceClientKey = JSON.stringify(retakeDefaults);

  const [recentPractice, recordings] = await Promise.all([
    getRecentPracticeSessionsByUserId(identity.userId),
    listUserVideos(`${identity.userId}/`, { maxKeys: 1000 }),
  ]);

  const interviewIdsWithRecordings = new Set(
    recordings.videos
      .map((video) => extractInterviewIdFromVideoKey(video.key))
      .filter((id): id is string => Boolean(id)),
  );

  const recordingBackedRecentPractice = recentPractice.filter((session) =>
    interviewIdsWithRecordings.has(session.id),
  );

  return (
    <PracticePageClient
      key={practiceClientKey}
      recentPractice={recordingBackedRecentPractice}
      retakeDefaults={retakeDefaults}
    />
  );
}
