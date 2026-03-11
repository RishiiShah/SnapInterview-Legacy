import PracticePageClient from "@/components/practice/PracticePageClient";
import { getRecentPracticeSessionsByUserId } from "@/lib/interview/metrics";
import { getSessionUserIdentity } from "@/lib/server-auth";

export default async function PracticePage() {
  const identity = await getSessionUserIdentity();
  const recentPractice = identity
    ? await getRecentPracticeSessionsByUserId(identity.userId)
    : [];

  return <PracticePageClient recentPractice={recentPractice} />;
}
