/**
 * Shows exactly what retrieval would inject into the system prompt for a given
 * session, without calling Groq or starting an interview.
 *
 * Use it to answer "is the interviewer drawing on the dataset, and does it react
 * to what I answered?" -- change --answer between runs and watch the retrieved
 * set move.
 *
 * Usage:
 *   npx tsx scripts/preview-retrieval.ts --role="Backend Developer"
 *   npx tsx scripts/preview-retrieval.ts \
 *     --role="React Developer" --type=technical \
 *     --resume="5 years React, Redux, performance profiling" \
 *     --jd="Senior frontend engineer. React, TypeScript, SSR, accessibility." \
 *     --answer="I memoized the list and moved state up to avoid re-renders." \
 *     --asked="Explain the use of hooks in React."
 *   npx tsx scripts/preview-retrieval.ts --role="Product Manager" --type=behavioral
 */
import { prisma } from "../src/lib/prisma";
import type { InterviewType, PromptInterviewSession } from "../src/lib/interview/domain";
import { buildSystemInstruction } from "../src/lib/interview/prompts";
import { explainRetrievalQuery, formatRetrievedQuestions, retrieveQuestionsForSession } from "../src/lib/rag/retrieve";

function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

  const role = flag("role") ?? "Backend Developer";
  const type = (flag("type") ?? "technical") as InterviewType;
  const answer = flag("answer") ?? null;
  const asked = (flag("asked") ?? "").split("|").map((q) => q.trim()).filter(Boolean);

  const session: PromptInterviewSession = {
    role,
    company: flag("company") ?? null,
    type,
    difficulty: (flag("difficulty") ?? "medium") as PromptInterviewSession["difficulty"],
    persona: null,
    jobDescription: flag("jd") ?? null,
    resumeUrl: null,
    resumeText: flag("resume") ?? null,
    questionCount: 10,
    currentQuestion: Number(flag("current") ?? 3),
    focusAreas: null,
    sessionPlan: null,
    // Retrieval reads transcript[0] as the most recent turn.
    transcript: [
      ...(answer ? [{ question: asked[0] ?? "(previous question)", answer, order: 0 }] : []),
      ...asked.slice(answer ? 1 : 0).map((question, index) => ({ question, answer: "", order: index + 1 })),
    ],
  };

  return { session, asked };
}

async function run() {
  const { session, asked } = main();

  console.log(`role:       ${session.role}`);
  console.log(`type:       ${session.type}`);
  console.log(`question:   ${session.currentQuestion} of ${session.questionCount}`);
  if (asked.length > 0) {
    console.log(`excluding:  ${asked.length} already-asked question(s)`);
  }

  // Which source contributed which terms. Empty means that source contributed
  // nothing to retrieval -- either it was absent, or every term was filtered.
  const parts = explainRetrievalQuery(session);
  console.log("\nretrieval query, by source:");
  for (const [source, terms] of Object.entries(parts)) {
    const label = source.padEnd(15);
    console.log(terms ? `  ${label} ${terms}` : `  ${label} (nothing contributed)`);
  }

  const started = Date.now();
  const retrieved = await retrieveQuestionsForSession(session);
  const elapsed = Date.now() - started;

  console.log(`\nretrieved ${retrieved.length} question(s) in ${elapsed}ms:`);
  for (const entry of retrieved) {
    console.log(`  ${entry.similarity.toFixed(3)}  [${entry.category}] ${entry.question}`);
  }

  if (retrieved.length === 0) {
    console.log("  (nothing — corpus empty, or every candidate was excluded)");
  }

  console.log(`\n${"─".repeat(72)}`);
  console.log("prompt block the interviewer receives:\n");
  console.log(formatRetrievedQuestions(retrieved) || "(no block — prompt is unchanged)");

  // Separately from retrieval: confirm the resume and job description reach the
  // system prompt as context. These are two different paths -- a resume can be
  // in the prompt while contributing nothing to retrieval, and vice versa.
  const prompt = await buildSystemInstruction(session);
  const resumeInPrompt = session.resumeText ? prompt.includes(session.resumeText.slice(0, 40)) : null;
  const jdInPrompt = session.jobDescription ? prompt.includes(session.jobDescription.slice(0, 40)) : null;

  console.log(`\n${"─".repeat(72)}`);
  console.log("context reaching the system prompt:");
  console.log(`  resume text:      ${resumeInPrompt === null ? "not provided" : resumeInPrompt ? "YES (verbatim)" : "NO"}`);
  console.log(`  job description:  ${jdInPrompt === null ? "not provided" : jdInPrompt ? "YES (verbatim)" : "NO"}`);
  console.log(`  company:          ${session.company ? `YES (${session.company})` : "not provided"}`);
  console.log(`  retrieved block:  ${retrieved.length > 0 ? `YES (${retrieved.length} questions)` : "NO"}`);
  console.log(`  system prompt:    ${prompt.length} chars, ~${Math.ceil(prompt.length / 4)} tokens`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
