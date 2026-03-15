import type { Prisma } from "@/generated/prisma/client";
import { QUESTIONS } from "@/data/questions";
import { buildSystemInstruction } from "@/lib/interview/prompts";
import { buildQuestionEvaluationRoleContext } from "@/lib/questions/evaluation";
import { groqClient } from "@/lib/ai/groq";
import { getInterviewSession, updateEvaluation } from "@/repositories/interview-repo";
import { z } from "zod/v4";

const transcriptEvaluationResponseSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string(),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
});

const questionEvaluationResponseSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string(),
});

export type TranscriptEvaluationResponse = z.infer<typeof transcriptEvaluationResponseSchema>;
export type QuestionEvaluationResponse = z.infer<typeof questionEvaluationResponseSchema>;

export async function evaluateInterviewTranscript(params: {
  userId: string;
  interviewId: string;
}): Promise<
  | { type: "not_found" }
  | { type: "no_transcript" }
  | { type: "error"; message: string }
  | { type: "ok"; data: TranscriptEvaluationResponse }
> {
  const { userId, interviewId } = params;

  const interviewSession = await getInterviewSession({ interviewId, userId, view: "evaluation" });
  if (!interviewSession) {
    return { type: "not_found" };
  }

  const { transcript, evaluation } = interviewSession;

  if (evaluation) {
    const cached = transcriptEvaluationResponseSchema.safeParse(evaluation);
    if (cached.success) {
      return { type: "ok", data: cached.data };
    }
  }

  if (!transcript.length) {
    return { type: "no_transcript" };
  }

  const roleContext = buildSystemInstruction(interviewSession);
  const formattedTranscript = transcript
    .map((entry, index) => `Q${index + 1}: ${entry.question}\nCandidate: ${entry.answer}`)
    .join("\n\n");

  try {
    const chatCompletion = await groqClient.chat.completions.create({
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

Based on the transcript, return a JSON object with exactly these four keys:
- "score": A number between 0 and 100 representing the overall interview performance.
- "feedback": A concise 2-3 paragraph summary of their performance, highlighting key takeaways.
- "strengths": An array of 2-4 strings, each being a short bullet point of something they did exceptionally well.
- "areasForImprovement": An array of 2-4 strings, each being a short bullet point of a specific area they need to work on.`,
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

    const responseContent = chatCompletion.choices[0]?.message?.content;
    if (!responseContent) {
      return { type: "error", message: "Empty response from evaluation service" };
    }

    const parsedEvaluation = transcriptEvaluationResponseSchema.parse(JSON.parse(responseContent));

    await updateEvaluation({
      interviewId: interviewSession.id,
      userId,
      evaluation: parsedEvaluation as unknown as Prisma.InputJsonValue,
    });

    return { type: "ok", data: parsedEvaluation };
  } catch (error) {
    console.error("Interview evaluation error:", error);
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

  const question = QUESTIONS.find((item) => item.id === questionId);
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

  const roleContext = buildQuestionEvaluationRoleContext(question);
  try {
    const chatCompletion = await groqClient.chat.completions.create({
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

    const responseContent = chatCompletion.choices[0]?.message?.content;
    if (!responseContent) {
      return { type: "error", message: "Empty response from evaluation service" };
    }

    const parsedEvaluation = questionEvaluationResponseSchema.parse(JSON.parse(responseContent));
    return { type: "ok", data: parsedEvaluation };
  } catch (error) {
    console.error("Practice question evaluation error:", error);
    return { type: "error", message: "Failed to generate answer evaluation" };
  }
}
