import { Prisma } from "@/generated/prisma/client";
import { groqClient } from "@/lib/ai/groq";
import { normalizePromptInterviewSession } from "@/lib/interview/domain";
import {
  getScorecardDimensionsForType,
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
import { formatMatchedEvaluationRubrics } from "@/lib/rag/evaluation-rubrics";
import { prisma } from "@/lib/prisma";
import { sendEvaluationEmail } from "@/lib/email";
import { getNotificationPrefs } from "@/repositories/user-repo";
import { readPlanSessionProvenance, readRoundProfileFromSessionPlan } from "@/lib/plans/session-context";

const EVALUATION_CLAIM_TTL_MS = 10 * 60 * 1000;

export type EvaluationServiceFailure =
  | { type: "invalid_session"; message: string }
  | { type: "upstream_error"; message: string };

export async function evaluateInterviewTranscript(params: {
  userId: string;
  interviewId: string;
}): Promise<
  | { type: "not_found" }
  | { type: "no_transcript" }
  | { type: "in_progress" }
  | EvaluationServiceFailure
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
    return { type: "invalid_session", message: "Interview session is invalid. Please start a new session." };
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
    const matchedRubrics = formatMatchedEvaluationRubrics(
      transcript,
      interviewSession.retrievedQuestions ?? []
    );

    const sessionPlan = interviewSession.sessionPlan as Record<string, unknown> | null;
    const brief = sessionPlan?.brief;
    const briefProfile = brief && typeof brief === "object"
      ? (brief as Record<string, unknown>).profile
      : null;
    const briefLevel = briefProfile && typeof briefProfile === "object"
      ? (briefProfile as Record<string, unknown>).level
      : null;
    const targetLevel = typeof briefLevel === "string" && briefLevel.trim()
      ? briefLevel.trim()
      : interviewSession.difficulty;
    const whiteboardScene = sessionPlan?.whiteboardScene as any;
    let whiteboardContext = "";
    if (
      whiteboardScene &&
      Array.isArray(whiteboardScene.nodes) &&
      whiteboardScene.nodes.length > 0
    ) {
      whiteboardContext = `\n\nCandidate's Final Architecture Whiteboard Diagram:\nNodes: ${whiteboardScene.nodes.map((n: any) => `${n.label} (${n.kind})`).join(", ")}\nConnections: ${whiteboardScene.edges?.map((e: any) => `${e.from} -> ${e.to}${e.label ? ` [${e.label}]` : ""}`).join("; ") || "None"}`;
    }
    const whiteboardSnapshot = sessionPlan?.whiteboardSnapshot;
    const hasWhiteboardSnapshot =
      whiteboardSnapshot &&
      typeof whiteboardSnapshot === "object" &&
      typeof (whiteboardSnapshot as Record<string, unknown>).imageBase64 === "string" &&
      ((whiteboardSnapshot as Record<string, unknown>).mimeType === "image/jpeg" ||
        (whiteboardSnapshot as Record<string, unknown>).mimeType === "image/png");
    const evaluationUserContent = `Interview Transcript:\n\n${formattedTranscript}${whiteboardContext}`;

    const roundProfile = readRoundProfileFromSessionPlan(interviewSession.sessionPlan);
    const planProvenance = readPlanSessionProvenance(interviewSession.sessionPlan);
    const targetDimensions = roundProfile?.rubric_dimensions ?? getScorecardDimensionsForType(promptInterviewSession.type);
    const dimensionsJsonExample = targetDimensions.map((d, i) => ({
      key: d.key,
      label: d.label,
      score: 85,
      weight: d.weight,
      summary: `${d.description}`,
      strengths: [`[Q${i + 1} Topic]: Concrete strength on ${d.label}`],
      growthAreas: [`[Q${i + 1} Topic]: Improvement area on ${d.label}`],
      evidenceCitations: [{ turnOrder: i + 1, quoteOrTopic: "Specific answer quote", note: "Evaluation rationale" }],
    }));

    let briefPillars: Array<{ id: string; title: string; source: string; targetMinutes: number }> = [];
    if (sessionPlan && typeof sessionPlan === "object") {
      const b = (sessionPlan as any).brief || (sessionPlan as any);
      if (b && Array.isArray(b.agenda?.pillars)) {
        briefPillars = b.agenda.pillars;
      }
    }

    const pillarInstructions = briefPillars.length > 0
      ? `\n7. AGENDA PILLAR COVERAGE:\nEvaluate whether the interview covered each planned agenda pillar:\n${briefPillars.map((p) => `- [${p.id}] "${p.title}" (source: ${p.source})`).join("\n")}\nReturn an entry for each pillar in "briefPillarCoverage" with "pillarId", "pillarTitle", "covered": true/false, and concise "notes".\n`
      : "";

    const pillarJsonExample = briefPillars.map((p) => ({
      pillarId: p.id,
      pillarTitle: p.title,
      covered: true,
      notes: "Covered during technical discussion.",
    }));

    const maxTokens = 3500;
    const systemContent = `You are a Principal Engineer and Hiring Committee Bar Raiser conducting a rigorous post-interview scorecard evaluation of a completed transcript.
Your goal is to provide a calibrated hiring verdict, estimated level, dimension-by-dimension scorecard with evidence citations, and concrete technical feedback.

Candidate Target Level: ${targetLevel}
Target Role: ${interviewSession.role}
Interview Type: ${interviewSession.type}
${roundProfile ? `Targeted Round: ${roundProfile.round_key}\nRound Purpose: ${roundProfile.purpose}\nRubric: ${roundProfile.rubric_key}` : ""}

Here is the role context and criteria:
---
${roleContext}
---
${matchedRubrics ? `\n${matchedRubrics}\n` : ""}

HIRING COMMITTEE EVALUATION RUBRIC & INSTRUCTIONS:
1. STRICTLY FORBIDDEN: Generic boilerplate. Every observation MUST be tied directly to specific claims and technical statements in the transcript.
2. CITATION REQUIREMENT: In each dimension's "evidenceCitations" and key strengths/gaps, cite the specific question (e.g. "[Q1 Architecture]", "[Q3 Concurrency]").
3. TECHNICAL RIGOR: Explicitly call out any architectural flaws or invalid assumptions and state the exact production pattern needed.
4. CALIBRATED VERDICT:
   - "strong_hire" (90-100): Clear top-tier signal, mastery of failure modes and trade-offs.
   - "hire" (75-89): Meets bar across all dimensions, sound fundamentals and execution.
   - "lean_hire" (65-74): Acceptable core answers with minor gaps on depth or edge cases.
   - "lean_no_hire" (50-64): Gaps in core architecture, misconceptions on fundamentals.
   - "no_hire" (<50): Critical flaws, security issues, or unable to decompose problems.
5. ESTIMATED LEVEL: One of ["entry-level", "mid-level", "senior", "staff-plus", "not-levelable"]. Provide levelRationale.
6. REQUIRED SCORECARD DIMENSIONS for ${interviewSession.type} (${targetDimensions.map((d) => `${d.key} [weight ${d.weight}]`).join(", ")}):
${targetDimensions.map((d) => `- "${d.key}" (${d.label}, weight ${d.weight}): ${d.description}`).join("\n")}${pillarInstructions}

Output MUST be valid JSON matching this exact structure:
{
  "version": 2,
  "overallScore": <number 0-100>,
  "verdict": <"strong_hire" | "hire" | "lean_hire" | "lean_no_hire" | "no_hire">,
  "estimatedLevel": <"entry-level" | "mid-level" | "senior" | "staff-plus" | "not-levelable">,
  "levelRationale": <string explaining level calibration>,
  "companySignals": {
    "matchedCompanyPack": "${interviewSession.company || "General Tech"}",
    "methodNotes": <string summarizing alignment with company method>
  },
  "rubricContext": ${roundProfile ? JSON.stringify({
    key: roundProfile.rubric_key,
    blueprintKey: planProvenance?.blueprintKey ?? null,
    blueprintVersion: planProvenance?.blueprintVersion ?? null,
  }) : "null"},
  "dimensions": ${JSON.stringify(dimensionsJsonExample, null, 2)},
  "briefPillarCoverage": ${JSON.stringify(pillarJsonExample, null, 2)},
  "executiveSummary": <detailed 2-3 paragraph summary>,
  "keyStrengths": [<3-5 strings formatted as "[Q# Topic]: <Specific decision>">],
  "criticalGaps": [<2-4 strings formatted as "[Q# Topic]: <Specific gap and correct production pattern>">],
  "recommendedPreparation": [<2-4 high leverage prep steps>]
}`;

    const chatCompletion = await withRetry(async () => {
      return groqClient.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemContent,
          },
          {
            role: "user",
            content: hasWhiteboardSnapshot
              ? [
                  { type: "text", text: evaluationUserContent },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${(whiteboardSnapshot as Record<string, string>).mimeType};base64,${(whiteboardSnapshot as Record<string, string>).imageBase64}`,
                    },
                  },
                ]
              : evaluationUserContent,
          },
        ],
        model: "qwen/qwen3.8-27b",
        temperature: 0.4,
        max_completion_tokens: 512,
        seed: 42,
        top_p: 0.9,
        response_format: { type: "json_object" },
        reasoning_effort: "none",
      });
    });


    const responseContent = chatCompletion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("Empty response from evaluation service");
    }

    const parsedEvaluation = parseTranscriptEvaluationResponse(responseContent);

    const persisted = await persistClaimedEvaluation({
      interviewId: interviewSession.id,
      userId,
      claimVersion,
      evaluation: parsedEvaluation as unknown as Prisma.InputJsonValue,
    });
    if (!persisted) {
      return { type: "invalid_session", message: "Evaluation ownership changed. Please try again." };
    }
    try {
      invalidateInterviewMetricsCache(userId);
    } catch (error) {
      logger.error("Failed to invalidate interview metrics cache", {
        error,
        interviewId,
        userId,
      });
    }

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
    return { type: "upstream_error", message: "Failed to generate interview evaluation" };
  }
}

export async function evaluatePracticeQuestion(params: {
  questionId: number;
  answer: string;
}): Promise<
  | { type: "not_found" }
  | { type: "upstream_error"; message: string }
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
        model: "qwen/qwen3.8-27b",
        temperature: 0.4,
        max_completion_tokens: 512,
        seed: 42,
        top_p: 0.9,
        response_format: { type: "json_object" },
        reasoning_effort: "none",
      });
    });

    const responseContent = chatCompletion.choices[0]?.message?.content;
    if (!responseContent) {
      return { type: "upstream_error", message: "Empty response from evaluation service" };
    }

    const parsedEvaluation = parseQuestionEvaluationResponse(responseContent);
    return { type: "ok", data: parsedEvaluation };
  } catch (error) {
    logger.error("Practice question evaluation error", { error, questionId });
    return { type: "upstream_error", message: "Failed to generate answer evaluation" };
  }
}

/**
 * Automatically evaluates an interview session upon completion in the background
 * and sends an email notification if configured.
 */
export async function triggerAutoEvaluation(params: {
  userId: string;
  interviewId: string;
  email?: string | null;
}): Promise<void> {
  try {
    const result = await evaluateInterviewTranscript({
      userId: params.userId,
      interviewId: params.interviewId,
    });

    if (result.type === "ok" && result.fresh) {
      let recipientEmail = params.email;
      if (!recipientEmail) {
        const user = await prisma.user.findUnique({
          where: { id: params.userId },
          select: { email: true },
        });
        recipientEmail = user?.email ?? null;
      }

      if (recipientEmail) {
        try {
          const prefs = await getNotificationPrefs(params.userId);
          if (prefs.emailNotifs) {
            await sendEvaluationEmail({
              to: recipientEmail,
              role: result.role,
              score: result.data.score,
              feedback: result.data.feedback,
              strengths: result.data.strengths,
              improvements: result.data.areasForImprovement,
            });
          }
        } catch (emailErr) {
          logger.error("Failed to send evaluation email during auto-evaluation", {
            error: emailErr instanceof Error ? emailErr.message : String(emailErr),
            interviewId: params.interviewId,
          });
        }
      }
    }
  } catch (err) {
    logger.error("Auto-evaluation failed", {
      error: err instanceof Error ? err.message : String(err),
      interviewId: params.interviewId,
      userId: params.userId,
    });
  }
}
