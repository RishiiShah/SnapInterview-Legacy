import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/server-auth";
import InterviewPageClient from "./InterviewPageClient";

export default async function InterviewPage() {
  const session = await getServerAuthSession();
  const userId = session?.user?.id ?? session?.session?.userId;

  if (!userId) {
    redirect("/login");
  }

  return <InterviewPageClient />;
}
