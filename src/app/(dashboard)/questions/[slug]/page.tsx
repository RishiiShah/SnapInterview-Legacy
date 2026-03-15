import Link from "next/link";
import QuestionDetailPageClient from "@/components/questions/QuestionDetailPageClient";
import { getPracticeQuestionRuntimeDataBySlug } from "@/repositories/question-repo";

export default async function QuestionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const runtimeData = await getPracticeQuestionRuntimeDataBySlug(slug);

  if (!runtimeData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-xl font-bold text-zinc-900">Question not found</h1>
        <p className="mt-2 text-sm text-zinc-500">The question you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/questions" className="mt-4 text-sm font-medium text-zinc-600 hover:text-zinc-900 underline">
          ← Back to Question Bank
        </Link>
      </div>
    );
  }

  const { question, allQuestions, currentIndex } = runtimeData;

  return (
    <QuestionDetailPageClient
      question={question}
      currentIndex={currentIndex}
      totalQuestions={allQuestions.length}
      prevQuestion={currentIndex > 0 ? allQuestions[currentIndex - 1] : null}
      nextQuestion={currentIndex < allQuestions.length - 1 ? allQuestions[currentIndex + 1] : null}
    />
  );
}
