import { CodingCatalogPageClient } from "@/components/coding/CodingCatalogPageClient";
import { getServerAuthSession } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import { getPublishedCodingQuestions } from "@/repositories/coding-question-repo";

export default async function CodingPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  const questions = await getPublishedCodingQuestions();
  return <CodingCatalogPageClient questions={questions} />;
}
