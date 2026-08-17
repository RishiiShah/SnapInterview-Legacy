import { Prisma } from "@/generated/prisma/client";
import { groqClient } from "@/lib/ai/groq";
import { normalizePromptInterviewSession } from "@/lib/interview/domain";
import {
  normalizeTranscriptEvaluation,
  parseQuestionEvaluationResponse,
  parseTranscriptEvaluationResponse,
  type QuestionEvaluationResponse,
  type TranscriptEvaluationResponse,
} from "@/lib/interview/evaluation";
import { invalidateInterviewMetricsCache } from "@/lib/interview/metrics";
import {
  buildQuestionEvaluationRoleContext,
  buildSystemInstruction,
} from "@/lib/interview/prompts";
import { logger } from "@/utils/logger";
import { withRetry } from "@/utils/retry";
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
            content: `You are a Principal Engineer and Hiring Committee Bar Raiser conducting a rigorous post-interview evaluation of a completed transcript.
Your goal is to provide an objective score (0-100), an evidence-based executive evaluation, and concrete, actionable technical feedback.

Candidate Target Level: ${interviewSession.difficulty}
Target Role: ${interviewSession.role}

Here is the role context and criteria:
---
${roleContext}
---

HIRING COMMITTEE EVALUATION RUBRIC & INSTRUCTIONS:
1. STRICTLY FORBIDDEN: Generic mad-libs boilerplate (e.g. "The candidate demonstrated a good understanding", "their thought process was logical", "needs to provide more detailed examples"). Every single observation MUST be tied directly to specific claims and technical statements in the transcript.
2. CITATION REQUIREMENT: Every item in "strengths" and "areasForImprovement" MUST start with the specific question reference (e.g. "[Q1 Architecture]", "[Q4 Security]").
3. TECHNICAL RIGOR: If the candidate made an invalid technical claim, security vulnerability (e.g. Base64 for passwords), or architectural flaw (e.g. ignoring database write locks or omitting payment idempotency keys), you MUST explicitly call out the flaw and state the exact production pattern/algorithm needed (e.g. bcrypt/Argon2id, PostgreSQL MVCC, Stripe Idempotency Keys).
4. LEVEL-CALIBRATED SCORING (0-100):
   - 90-100: Strong Hire (Mastery of trade-offs, edge cases, distributed failure modes)
   - 75-89: Hire (Solid design, sound fundamentals, clear communication)
   - 65-74: Leaning Hire (Acceptable core answers, but missed edge cases or deeper trade-offs)
   - 50-64: Leaning No Hire (Significant technical gaps or invalid architectural assumptions)
   - <50: No Hire (Critical security vulnerabilities or foundational misconceptions)

Required JSON Output Structure with exactly these seven keys:
- "score": A number (0-100) calibrated against the ${interviewSession.difficulty} level bar.
- "feedback": A detailed, 2-3 paragraph executive summary covering: (1) Overall hiring verdict and level assessment, (2) Key architectural decisions done well with transcript references, and (3) Critical technical gaps, security vulnerabilities, or trade-offs that were missed.
- "strengths": An array of 2-4 strings, formatted as "[Q# Topic]: <Specific decision or architecture pattern the candidate got right>".
- "areasForImprovement": An array of 2-4 strings, formatted as "[Q# Topic]: <Specific misconception or error in candidate's answer>, and <the exact production architecture, algorithm, or pattern they should have used>".
- "communication": A number (0-100) rating structure, articulation, conciseness, and absence of rambling.
- "technicalDepth": A number (0-100) rating architectural correctness, understanding of concurrency/scale, security, and edge cases.
- "clarity": A number (0-100) rating logical reasoning and coherence.`,
          },
          {
            role: "user",
            content: `Interview Transcript:\n\n${formattedTranscript}`,
          },
        ],
        model: "qwen/qwen3.6-27b",
        temperature: 0.1,
        max_completion_tokens: 2048,
        response_format: { type: "json_object" },
        reasoning_effort: "none",
      } as any);
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

  const roleContext = await buildQuestionEvaluationRoleContext(question.category);
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
        model: "qwen/qwen3.6-27b",
        temperature: 0.1,
        max_completion_tokens: 2048,
        response_format: { type: "json_object" },
        reasoning_effort: "none",
      } as any);
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
