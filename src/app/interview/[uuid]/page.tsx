import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/server-auth";
import InterviewPageClient from "./InterviewPageClient";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const [session] = await Promise.all([
    getServerAuthSession(),
    params,
  ]);
  const userId = session?.user?.id ?? session?.session?.userId;

  if (!userId) {
    redirect("/login");
  }

  // A newly-created UUID has no persisted session until the user joins from
  // PreJoin. Avoid holding that screen behind a guaranteed empty DB lookup.
  return <InterviewPageClient />;
}
