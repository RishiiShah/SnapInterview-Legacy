import type { Question } from "@/data/types";

export function isCodingQuestion(question: Pick<Question, "type" | "category">): boolean {
  return question.type === "coding" || question.category === "coding";
}

export function filterQuestionsByScope(
  questions: Question[],
  scope: "all" | "coding" | "interview",
): Question[] {
  if (scope === "coding") return questions.filter(isCodingQuestion);
  if (scope === "interview") return questions.filter((q) => !isCodingQuestion(q));
  return questions;
}
