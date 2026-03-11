import type { Question } from "@/data/types";
import { buildSystemInstruction } from "@/lib/interview/prompts";

function inferPracticeRole(question: Question): string {
  if (question.category === "leadership") {
    return "Engineering Manager";
  }

  if (question.category === "technical") {
    const lowerTags = question.tags.map((tag) => tag.toLowerCase());
    const frontendSignals = ["react", "frontend", "javascript", "typescript", "css", "dom"];
    const hasFrontendSignal = frontendSignals.some((signal) =>
      lowerTags.some((tag) => tag.includes(signal))
    );

    if (hasFrontendSignal) {
      return "Frontend Developer";
    }
  }

  return "Software Engineer";
}

export function buildQuestionEvaluationRoleContext(question: Question): string {
  const role = inferPracticeRole(question);
  const pseudoJobDescription = [
    `Practice question category: ${question.category}`,
    `Practice question difficulty: ${question.difficulty}`,
    `Question prompt: ${question.text}`,
    question.hint ? `Hint shared with candidate: ${question.hint}` : null,
    question.tags.length > 0 ? `Tagged skills: ${question.tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return buildSystemInstruction({
    role,
    company: null,
    type: question.category,
    difficulty: question.difficulty,
    jobDescription: pseudoJobDescription,
    resumeUrl: null,
    questionCount: 1,
    currentQuestion: 0,
    transcript: [],
  });
}
