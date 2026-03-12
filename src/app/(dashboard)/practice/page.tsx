import PracticePageClient from "@/components/practice/PracticePageClient";
import { getRecentPracticeSessionsByUserId } from "@/lib/interview/metrics";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export default async function PracticePage() {
  const identity = await getSessionUserIdentity();

  if (!identity) {
    redirect("/login");
  }

  const recentPractice = await getRecentPracticeSessionsByUserId(identity.userId);

  return <PracticePageClient recentPractice={recentPractice} />;
}
