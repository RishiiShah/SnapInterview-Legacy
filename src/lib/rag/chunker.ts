import { sanitizeResumeText } from "@/lib/resume/sanitizer";

export type ChunkSection =
  | "skills"
  | "experience"
  | "projects"
  | "summary"
  | "job_description"
  | "general";

export interface SemanticChunk {
  id: string;
  section: ChunkSection;
  title?: string;
  text: string;
  keywords: string[];
  priority: number;
}

export interface ScoredSemanticChunk extends SemanticChunk {
  score: number;
  selected: boolean;
  vector?: number[];
}

/** Common technical keywords and stop words for high-accuracy token extraction */
const TECHNICAL_KEYWORD_REGEX =
  /\b[A-Za-z0-9+#.-]{2,}\b/g;

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "by", "for", "with",
  "about", "against", "between", "into", "through", "during", "before", "after",
  "above", "below", "to", "from", "up", "down", "is", "are", "was", "were",
  "be", "been", "being", "have", "has", "had", "do", "does", "did", "can",
  "could", "would", "should", "shall", "will", "may", "might", "must",
  "you", "your", "yours", "it", "its", "they", "their", "them", "we", "our",
  "us", "that", "this", "these", "those", "what", "when", "which", "who",
  "whom", "whose", "why", "how", "all", "any", "both", "each", "few", "more",
  "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same",
  "so", "than", "too", "very", "just", "like", "using", "used", "work", "worked",
  "working", "built", "build", "building", "team", "year", "years", "experience",
  "responsible", "including", "across", "within", "various", "multiple", "ensure",
  "ensured", "provided", "project", "projects", "system", "systems", "application",
  "applications", "service", "services", "company", "inc", "llc", "corp",
]);

/**
 * Extracts unique, meaningful technical terms and keywords from text.
 */
export function extractKeyTechnicalTerms(text: string): string[] {
  if (!text || !text.trim()) return [];

  const matches = text.match(TECHNICAL_KEYWORD_REGEX) || [];
  const terms = new Set<string>();

  for (const match of matches) {
    const clean = match.trim();
    const lower = clean.toLowerCase();
    if (
      clean.length > 1 &&
      !STOP_WORDS.has(lower) &&
      !/^\d+$/.test(clean) && // skip bare numbers
      !/^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)$/i.test(clean)
    ) {
      terms.add(clean);
    }
  }

  return Array.from(terms);
}

/**
 * Categorizes a section heading into a standard ChunkSection.
 */
function classifySectionHeader(header: string): ChunkSection {
  const upper = header.toUpperCase();
  if (upper.includes("SKILL") || upper.includes("COMPETENC") || upper.includes("TECHNOLOG")) {
    return "skills";
  }
  if (upper.includes("EXPERIENCE") || upper.includes("EMPLOYMENT") || upper.includes("WORK HISTORY")) {
    return "experience";
  }
  if (upper.includes("PROJECT")) {
    return "projects";
  }
  if (upper.includes("SUMMARY") || upper.includes("OBJECTIVE") || upper.includes("PROFILE")) {
    return "summary";
  }
  return "general";
}

/**
 * Parses cleaned resume text into coherent, section-aware semantic chunks.
 * Skills stay together as high-priority chunks; projects and job experiences form cohesive units.
 */
export function chunkResumeSemantic(resumeText: string): SemanticChunk[] {
  if (!resumeText || !resumeText.trim()) return [];

  const structuredText = sanitizeResumeText(resumeText);
  const paragraphs = structuredText.split(/\n\n+/);
  const chunks: SemanticChunk[] = [];
  let currentSection: ChunkSection = "general";
  let chunkIndex = 0;

  for (const para of paragraphs) {
    const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const firstLine = lines[0];
    if (firstLine.startsWith("## ")) {
      const headerTitle = firstLine.replace(/^##\s+/, "").trim();
      currentSection = classifySectionHeader(headerTitle);

      // Skip pure Education or Certifications boilerplate if desired, or keep as general
      if (
        headerTitle.toUpperCase().includes("EDUCATION") ||
        headerTitle.toUpperCase().includes("ACADEMIC") ||
        headerTitle.toUpperCase().includes("AWARDS")
      ) {
        continue;
      }

      const remainingLines = lines.slice(1);
      if (remainingLines.length === 0) continue;

      if (currentSection === "skills") {
        // Skills block: preserve as cohesive high-priority chunks
        const content = remainingLines.join(" ");
        if (content.length > 0) {
          chunks.push({
            id: `resume_chunk_${chunkIndex++}`,
            section: "skills",
            title: headerTitle,
            text: content,
            keywords: extractKeyTechnicalTerms(content),
            priority: 1.2, // Skills get high baseline priority
          });
        }
        continue;
      }
    }

    if (currentSection === "skills") {
      const content = lines.join(" ");
      if (content.length > 20) {
        chunks.push({
          id: `resume_chunk_${chunkIndex++}`,
          section: "skills",
          text: content,
          keywords: extractKeyTechnicalTerms(content),
          priority: 1.2,
        });
      }
      continue;
    }

    // For experience and projects, group title with its bullet points
    let currentBlockTitle: string | undefined;
    let blockBullets: string[] = [];

    for (const line of lines) {
      if (line.startsWith("- ")) {
        blockBullets.push(line.replace(/^-+\s*/, ""));
      } else if (!line.startsWith("## ")) {
        if (blockBullets.length > 0) {
          // Flush previous sub-block
          const blockText = [currentBlockTitle, ...blockBullets].filter(Boolean).join(". ");
          if (blockText.length > 25) {
            chunks.push({
              id: `resume_chunk_${chunkIndex++}`,
              section: currentSection,
              title: currentBlockTitle,
              text: blockText,
              keywords: extractKeyTechnicalTerms(blockText),
              priority: currentSection === "experience" ? 1.0 : 0.9,
            });
          }
          blockBullets = [];
        }
        currentBlockTitle = line;
      }
    }

    if (blockBullets.length > 0 || currentBlockTitle) {
      const blockText = [currentBlockTitle, ...blockBullets].filter(Boolean).join(". ");
      if (blockText.length > 25) {
        chunks.push({
          id: `resume_chunk_${chunkIndex++}`,
          section: currentSection,
          title: currentBlockTitle,
          text: blockText,
          keywords: extractKeyTechnicalTerms(blockText),
          priority: currentSection === "experience" ? 1.0 : 0.9,
        });
      }
    }
  }

  // Fallback: If no structured sections were extracted, chunk by paragraphs/sentences cleanly
  if (chunks.length === 0) {
    const rawBlocks = resumeText.split(/\n\n+/).map((b) => b.trim()).filter((b) => b.length > 30);
    for (const block of rawBlocks) {
      chunks.push({
        id: `resume_chunk_${chunkIndex++}`,
        section: "general",
        text: block,
        keywords: extractKeyTechnicalTerms(block),
        priority: 0.8,
      });
    }
  }

  return chunks.slice(0, 12); // Limit to top 12 representative chunks for bounded processing
}

/**
 * Parses job description into semantic chunks (responsibilities, requirements, technical domain).
 */
export function chunkJobDescription(jdText: string): SemanticChunk[] {
  if (!jdText || !jdText.trim()) return [];

  const cleaned = jdText.replace(/\r\n/g, "\n").trim();
  const paragraphs = cleaned.split(/\n\n+/).filter((p) => p.trim().length > 30);
  const chunks: SemanticChunk[] = [];
  let chunkIndex = 0;

  for (const para of paragraphs) {
    const text = para.replace(/\s+/g, " ").trim();
    chunks.push({
      id: `jd_chunk_${chunkIndex++}`,
      section: "job_description",
      text,
      keywords: extractKeyTechnicalTerms(text),
      priority: 1.0,
    });
  }

  return chunks.slice(0, 6);
}

/**
 * Selects the most relevant, non-redundant semantic chunks against a context vector.
 */
export function selectDiverseChunks(
  scoredChunks: ScoredSemanticChunk[],
  limit: number,
  cosineSimFn: (a: number[], b: number[]) => number,
  redundancyThreshold = 0.82
): ScoredSemanticChunk[] {
  const sorted = [...scoredChunks].sort((a, b) => b.score - a.score);
  const selected: ScoredSemanticChunk[] = [];

  for (const candidate of sorted) {
    if (selected.length >= limit) break;

    const isRedundant = selected.some((chosen) => {
      if (chosen.vector && candidate.vector) {
        return cosineSimFn(chosen.vector, candidate.vector) >= redundancyThreshold;
      }
      // Lexical Jaccard redundancy fallback if vectors absent
      const setA = new Set(chosen.keywords);
      const setB = new Set(candidate.keywords);
      const intersection = [...setA].filter((x) => setB.has(x)).length;
      const union = new Set([...setA, ...setB]).size;
      return union > 0 && intersection / union >= 0.7;
    });

    if (!isRedundant) {
      selected.push({ ...candidate, selected: true });
    }
  }

  return selected;
}

/**
 * Dynamic Multi-Turn Chunk Tracker:
 * Prioritizes uncovered chunks as the interview progresses so that questions explore
 * the candidate's full profile rather than circling the same job experience.
 *
 * Supports both elapsed-time-based stage awareness and turn-based fallback:
 * - If timeContext is provided (startedAt + durationMinutes), early stage is determined when elapsed time < 25% of duration.
 * - Otherwise falls back to turnNumber <= 1.
 */
export function selectActiveResumeChunk(
  chunks: SemanticChunk[],
  coveredChunkIds: Set<string>,
  turnNumber: number,
  timeContext?: { startedAt?: string | Date | null; durationMinutes?: number | null }
): { activeChunk: SemanticChunk | null; unprobedCount: number } {
  if (chunks.length === 0) {
    return { activeChunk: null, unprobedCount: 0 };
  }

  let isEarlyStage = turnNumber <= 1;

  if (timeContext?.startedAt && timeContext?.durationMinutes && timeContext.durationMinutes > 0) {
    const startedMs = new Date(timeContext.startedAt).getTime();
    if (!Number.isNaN(startedMs)) {
      const elapsedMs = Math.max(0, Date.now() - startedMs);
      const totalMs = timeContext.durationMinutes * 60_000;
      // Early warmup phase: first 25% of interview duration
      isEarlyStage = elapsedMs / totalMs < 0.25;
    }
  }

  // Skills chunk is always foundational for early turns/stage
  if (isEarlyStage) {
    const skillsChunk = chunks.find((c) => c.section === "skills" && !coveredChunkIds.has(c.id));
    if (skillsChunk) {
      return {
        activeChunk: skillsChunk,
        unprobedCount: chunks.filter((c) => !coveredChunkIds.has(c.id)).length,
      };
    }
  }

  // Find unprobed chunks with highest priority
  const unprobed = chunks.filter((c) => !coveredChunkIds.has(c.id));
  if (unprobed.length > 0) {
    // Sort by priority descending
    const chosen = [...unprobed].sort((a, b) => b.priority - a.priority)[0];
    return { activeChunk: chosen, unprobedCount: unprobed.length };
  }

  // If all probed, loop back to the highest priority chunk
  const fallback = [...chunks].sort((a, b) => b.priority - a.priority)[0];
  return { activeChunk: fallback, unprobedCount: 0 };
}
