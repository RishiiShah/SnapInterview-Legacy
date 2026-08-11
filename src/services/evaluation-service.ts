import type { Prisma } from "@/generated/prisma/client";
import { buildSystemInstruction } from "@/lib/interview/prompts";
import { normalizePromptInterviewSession } from "@/lib/interview/domain";
import {
  normalizeTranscriptEvaluation,
  parseQuestionEvaluationResponse,
  parseTranscriptEvaluationResponse,
  type QuestionEvaluationResponse,
  type TranscriptEvaluationResponse,
} from "@/lib/interview/evaluation";
import { invalidateInterviewMetricsCache } from "@/lib/interview/metrics";
import { buildQuestionEvaluationRoleContext } from "@/lib/questions/evaluation";
import { groqClient } from "@/lib/ai/groq";
import { withRetry } from "@/utils/retry";
import { logger } from "@/utils/logger";
import {
  claimInterviewEvaluation,
  getInterviewSession,
  persistClaimedEvaluation,
  releaseInterviewEvaluationClaim,
} from "@/repositories/interview-repo";
import { getPracticeQuestionById } from "@/repositories/question-repo";

const EVALUATION_CLAIM_TTL_MS = 10 * 60 * 1000;

export async function evaluateInterviewTranscript(params: {
  userId: string;
  interviewId: string;
}): Promise<
  | { type: "not_found" }
  | { type: "no_transcript" }
  | { type: "in_progress" }
  | { type: "error"; message: string }
  | { type: "ok"; data: TranscriptEvaluationResponse; role: string; fresh: boolean }
> {
  const { userId, interviewId } = params;

  const interviewSession = await getInterviewSession({ interviewId, userId, view: "evaluation" });
  if (!interviewSession) {
    return { type: "not_found" };
  }

  const { transcript, evaluation } = interviewSession;

  if (evaluation) {
    const cached = normalizeTranscriptEvaluation(evaluation);
    if (cached) {
      return { type: "ok", data: cached, role: interviewSession.role, fresh: false };
    }
  }

  if (!transcript.length) {
    return { type: "no_transcript" };
  }

  const promptInterviewSession = normalizePromptInterviewSession(interviewSession);
  if (!promptInterviewSession) {
    logger.error("Interview evaluation received invalid domain values", { interviewId });
    return { type: "error", message: "Interview session is invalid. Please start a new session." };
  }

  const claimedAt = new Date();
  const claimVersion = await claimInterviewEvaluation({
    interviewId,
    userId,
    expectedClaimVersion: interviewSession.evaluationClaimVersion,
    claimedAt,
    staleBefore: new Date(claimedAt.getTime() - EVALUATION_CLAIM_TTL_MS),
  });
  if (claimVersion === null) {
    return { type: "in_progress" };
  }

  try {
    // Retrieval calibrates the next live question. A completed transcript has no
    // next question, so avoid its embedding-model/database work while grading.
    const roleContext = await buildSystemInstruction(promptInterviewSession, {
      includeQuestionRetrieval: false,
    });
    const formattedTranscript = transcript
      .map((entry, index) => `Q${index + 1}: ${entry.question}\nCandidate: ${entry.answer}`)
      .join("\n\n");

    const chatCompletion = await withRetry(async () => {
      return groqClient.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an expert technical interviewer evaluating a completely finished interview transcript.
Your goal is to provide a fair, objective final score (0-100) and actionable feedback based on the candidate's overall performance.

Here is the context and criteria for the role the candidate was interviewing for:
---
${roleContext}
---

Evaluation Criteria:
1. Did the candidate demonstrate the required skills for the ${interviewSession.difficulty} level ${interviewSession.role} position?
2. Were their answers structured logically and clearly communicated?
3. Did they handle follow-up questions well, showing depth of knowledge?
4. Did they quantify their impact and provide concrete examples?

Based on the transcript, return a JSON object with exactly these seven keys:
- "score": A number between 0 and 100 representing the overall interview performance.
- "feedback": A concise 2-3 paragraph summary of their performance, highlighting key takeaways.
- "strengths": An array of 2-4 strings, each being a short bullet point of something they did exceptionally well.
- "areasForImprovement": An array of 2-4 strings, each being a short bullet point of a specific area they need to work on.
- "communication": A number between 0 and 100 rating how clearly and effectively they communicated (structure, articulation, conciseness).
- "technicalDepth": A number between 0 and 100 rating the depth and accuracy of their technical knowledge and reasoning.
- "clarity": A number between 0 and 100 rating how well-organised and easy to follow their answers were (logical flow, no rambling).`,
          },
          {
            role: "user",
            content: `Interview Transcript:\n\n${formattedTranscript}`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_completion_tokens: 1500,
        response_format: { type: "json_object" },
      });
    });

    const responseContent = chatCompletion.choices[0]?.message?.content;
    if (!responseContent) {
      return { type: "error", message: "Empty response from evaluation service" };
    }

    const parsedEvaluation = parseTranscriptEvaluationResponse(responseContent);

    const persisted = await persistClaimedEvaluation({
      interviewId: interviewSession.id,
      userId,
      claimVersion,
      evaluation: parsedEvaluation as unknown as Prisma.InputJsonValue,
    });
    if (!persisted) {
      return { type: "error", message: "Evaluation ownership changed. Please try again." };
    }
    invalidateInterviewMetricsCache(userId);

    return { type: "ok", data: parsedEvaluation, role: interviewSession.role, fresh: true };
  } catch (error) {
    try {
      await releaseInterviewEvaluationClaim({
        interviewId: interviewSession.id,
        userId,
        claimVersion,
      });
    } catch (releaseError) {
      logger.error("Failed to release interview evaluation claim", {
        error: releaseError,
        interviewId,
      });
    }
    logger.error("Interview evaluation error", { error, interviewId });
    return { type: "error", message: "Failed to generate interview evaluation" };
  }
}

export async function evaluatePracticeQuestion(params: {
  questionId: number;
  answer: string;
}): Promise<
  | { type: "not_found" }
  | { type: "error"; message: string }
  | { type: "empty"; data: QuestionEvaluationResponse }
  | { type: "ok"; data: QuestionEvaluationResponse }
> {
  const { questionId, answer } = params;

  const question = await getPracticeQuestionById(questionId);
  if (!question) {
    return { type: "not_found" };
  }

  const trimmed = answer.trim();
  if (!trimmed) {
    return {
      type: "empty",
      data: {
        score: 0,
        feedback: "No answer submitted. Add a concise story with situation, actions, and measurable outcome.",
      },
    };
  }

  const roleContext = await buildQuestionEvaluationRoleContext(question);
  try {
    const chatCompletion = await withRetry(async () => {
      return groqClient.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an expert technical interviewer evaluating a candidate's answer to a practice question.
Your goal is to provide a fair, objective score (0-100) and actionable feedback.

Here is the role-aligned context and criteria reference:
---
${roleContext}
---

Question Details:
- Category: ${question.category}
- Difficulty: ${question.difficulty}
- Question: "${question.text}"
- Hint provided to candidate: "${question.hint}"

Evaluation Criteria:
1. Does the answer directly address the question?
2. Is the answer structured logically? (e.g., using STAR method for behavioral questions)
3. Is the technical depth appropriate for a ${question.difficulty} difficulty question?
4. Are there concrete examples, metrics, or specifics provided?

Return your evaluation as a JSON object with exactly these two keys:
- "score": A number between 0 and 100 representing the overall quality of the answer.
- "feedback": A concise paragraph highlighting what was good and specific areas for improvement.`,
          },
          {
            role: "user",
            content: `Candidate's Answer:\n"${trimmed}"`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        response_format: { type: "json_object" },
      });
    });

    const responseContent = chatCompletion.choices[0]?.message?.content;
    if (!responseContent) {
      return { type: "error", message: "Empty response from evaluation service" };
    }

    const parsedEvaluation = parseQuestionEvaluationResponse(responseContent);
    return { type: "ok", data: parsedEvaluation };
  } catch (error) {
    logger.error("Practice question evaluation error", { error, questionId });
    return { type: "error", message: "Failed to generate answer evaluation" };
  }
}
