import PracticePageClient from "@/components/practice/PracticePageClient";
import { parsePracticeRetakeDefaults, type PracticeRetakeSearchParams } from "@/lib/practice/retake-defaults";
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

  return (
    <PracticePageClient
      key={practiceClientKey}
      retakeDefaults={retakeDefaults}
    />
  );
}
