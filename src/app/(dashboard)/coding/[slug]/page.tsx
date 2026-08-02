import Link from "next/link";
import { redirect } from "next/navigation";
import QuestionDetailPageClient from "@/components/questions/QuestionDetailPageClient";
import {
  filterQuestionsByScope,
  getPracticeQuestionRuntimeDataBySlug,
} from "@/repositories/question-repo";
import { isCodingQuestion } from "@/lib/questions/scope";

export default async function CodingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const runtimeData = await getPracticeQuestionRuntimeDataBySlug(slug, "all");

  if (!runtimeData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-xl font-bold text-[#F2F4F8]">Problem not found</h1>
        <p className="mt-2 text-sm text-[#A8B0C2]">
          The coding problem you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/coding"
          className="mt-4 text-sm font-medium text-[#93C5FD] underline hover:text-[#BFDBFE]"
        >
          ← Back to Coding
        </Link>
      </div>
    );
  }

  if (!isCodingQuestion(runtimeData.question)) {
    redirect(`/questions/${slug}`);
  }

  const allQuestions = filterQuestionsByScope(runtimeData.allQuestions, "coding");
  const currentIndex = allQuestions.findIndex((question) => question.slug === slug);

  return (
    <QuestionDetailPageClient
      question={runtimeData.question}
      currentIndex={currentIndex}
      totalQuestions={allQuestions.length}
      prevQuestion={currentIndex > 0 ? allQuestions[currentIndex - 1] : null}
      nextQuestion={currentIndex < allQuestions.length - 1 ? allQuestions[currentIndex + 1] : null}
      basePath="/coding"
      listLabel="Problem List"
    />
  );
}
