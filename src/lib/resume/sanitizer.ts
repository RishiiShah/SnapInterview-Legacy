/**
 * Comprehensive resume text sanitizer and normalizer.
 * Cleans PDF parsing artifacts:
 * - Removes unicode bullet symbols (●, •, ▪, ◆, ○, etc.)
 * - Strips page numbers & header/footer markers (-- 1 of 2 --, Page 1 of 2)
 * - De-hyphenates split words (publisher-\nside -> publisher-side)
 * - Stitches broken wrapped sentences into coherent paragraphs/bullets
 * - Normalizes section headers (EDUCATION, SKILLS, EXPERIENCE, PROJECTS, ACHIEVEMENTS)
 */

export const BULLET_CHARACTERS_REGEX = /[●•▪◆○►*–—\u25cf\u2022\u25aa\u25fe\u25c6\u25cb\uf0b7\uf0a7\u2023\u2043\u2219]/g;

export const KNOWN_SECTION_HEADERS = [
  "EDUCATION",
  "ACADEMIC BACKGROUND",
  "TECHNICAL SKILLS",
  "SKILLS & PROFICIENCIES",
  "SKILLS",
  "CORE COMPETENCIES",
  "PROFESSIONAL EXPERIENCE",
  "WORK EXPERIENCE",
  "EXPERIENCE",
  "EMPLOYMENT HISTORY",
  "PROJECTS",
  "TECHNICAL PROJECTS",
  "KEY PROJECTS",
  "ACADEMIC PROJECTS",
  "ACHIEVEMENTS / EXTRA CURRICULAR ACTIVITIES",
  "ACHIEVEMENTS / EXTRA CURRICULAR",
  "ACHIEVEMENTS",
  "AWARDS & HONORS",
  "AWARDS",
  "HONORS",
  "CERTIFICATIONS",
  "PUBLICATIONS",
  "LEADERSHIP",
  "PROFESSIONAL SUMMARY",
  "SUMMARY",
  "OBJECTIVE",
];

// Matches ONLY lines that are entirely page number artifacts: "-- 1 of 2 --", "Page 1 of 2", but NOT "10/10 SGPA"
export const PAGE_NUMBER_REGEX = /^(?:--\s*\d+\s*(?:of)\s*\d+\s*--|page\s+\d+\s*(?:of)\s*\d+)$/i;
export const DATE_RANGE_REGEX = /\b(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?\d{4}(?:\s*(?:–|-|to)\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:\d{4}|Present|Current))?\b/i;
export const TRAILING_DATE_REGEX = /(?:\s*[|,]?\s*)(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?\d{4}(?:\s*(?:–|-|to)\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:\d{4}|Present|Current))?$/i;
export const ACTION_VERB_REGEX = /^(?:built|developed|implemented|engineered|designed|created|integrated|managed|led|spearheaded|refactored|programmed|working|improving|optimized|collaborated|conducted|achieved|deployed|automated|maintained|authored|evaluated|researched|trained|tested|analyzed|provided|resolved|enhanced|monitored|leveraged|configured|participated|assisted)\b/i;

/**
 * Strips leading bullet markers, duplicate bullets, and numbering from a line.
 */
export function stripBulletMarkers(line: string): string {
  let cleaned = line.trim();
  // Strip repeated bullet characters, e.g. "•  ●", "●", "- ●", "•"
  cleaned = cleaned.replace(/^[●•▪◆○►*–—\u25cf\u2022\u25aa\u25fe\u25c6\u25cb\uf0b7\uf0a7\u2023\u2043\u2219\s-]+/, "");
  // Strip numbered lists, e.g. "1. ", "1) "
  cleaned = cleaned.replace(/^\d+[.)]\s+/, "");
  return cleaned.trim();
}

/**
 * Checks if a line is a known section header.
 */
export function matchSectionHeader(line: string): string | null {
  const normalized = line.toUpperCase().replace(/[:#_]/g, "").replace(/\s+/g, " ").trim();
  for (const header of KNOWN_SECTION_HEADERS) {
    if (normalized === header || normalized === `KEY ${header}` || normalized === `MY ${header}`) {
      return header;
    }
  }
  return null;
}

/**
 * Checks if a line is a bullet point in the raw text.
 */
export function isBulletLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /^[●•▪◆○►*–—\u25cf\u2022\u25aa\u25fe\u25c6\u25cb\uf0b7\uf0a7\u2023\u2043\u2219]/.test(trimmed) ||
         /^[-*]\s+/.test(trimmed) ||
         /^\d+[.)]\s+/.test(trimmed);
}

/**
 * Determines if a line is likely a Title/Heading (e.g. Project Name, Company, Degree)
 * rather than an accomplishment bullet.
 */
export function isTitleOrHeadingLine(line: string): boolean {
  const clean = stripBulletMarkers(line);
  if (!clean) return false;
  if (matchSectionHeader(clean)) return true;
  // Action verb lines are ALWAYS accomplishment bullets – never headings
  if (ACTION_VERB_REGEX.test(clean)) return false;
  // Date-only lines (e.g. "2022" or "September 2025 – Present") are heading/date separators
  if (DATE_RANGE_REGEX.test(clean) && clean.trim().match(/^[\w\s–\-,./]+$/) && clean.length < 35) return true;
  if ((clean.includes(" – ") || clean.includes(" - ") || clean.includes(" | ")) && !ACTION_VERB_REGEX.test(clean)) {
    return true;
  }
  return false;
}

/**
 * Sanitizes and normalizes raw text extracted from PDF.
 * Returns structured, clean text with "- " for bullets and "## " for sections.
 */
export function sanitizeResumeText(rawText: string): string {
  if (!rawText || !rawText.trim()) return "";

  // Split into raw lines preserving explicit double breaks
  const rawParagraphs = rawText.split(/\r?\n\r?\n/);
  const structuredParagraphs: string[] = [];

  for (const paragraph of rawParagraphs) {
    const rawLines = paragraph.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (rawLines.length === 0) continue;

    const processedLines: string[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i] ?? "";
      if (!line) continue;

      // Filter out page numbers: "-- 1 of 2 --", "Page 1 of 2", etc.
      if (PAGE_NUMBER_REGEX.test(line)) {
        continue;
      }

      // Check if this line is a Section Header
      const matchedHeader = matchSectionHeader(line);
      if (matchedHeader) {
        processedLines.push(`## ${matchedHeader}`);
        continue;
      }

      const isBullet = isBulletLine(line);
      const cleanContent = stripBulletMarkers(line);
      if (!cleanContent) continue;

      // Explicitly bulleted lines (●, •, -, *) are ALWAYS bullets — never reclassified as titles.
      // Only non-bulleted plain lines may be classified as titles/headings.
      const isTitle = !isBullet && isTitleOrHeadingLine(line);

      // If line is a non-bulleted title/heading, preserve it as a clean title line
      if (isTitle) {
        processedLines.push(cleanContent);
        continue;
      }

      if (isBullet) {
        // It's a new bullet point
        processedLines.push(`- ${cleanContent}`);
      } else {
        // Check if this line is a continuation of the previous bullet line
        const prevIdx = processedLines.length - 1;
        const prevLine = prevIdx >= 0 ? processedLines[prevIdx] : null;

        const isPrevSection = prevLine?.startsWith("## ");
        const isPrevBullet = prevLine?.startsWith("- ");
        const prevEndsWithPunctuation = prevLine ? /[.!?:;]$/.test(prevLine.trim()) : false;

        // ONLY stitch if previous line is an unpunctuated bullet and current line is not a title/section
        if (prevLine && isPrevBullet && !isPrevSection && !prevEndsWithPunctuation && !isTitle) {
          if (prevLine.endsWith("-")) {
            processedLines[prevIdx] = `${prevLine}${cleanContent}`;
          } else {
            processedLines[prevIdx] = `${prevLine} ${cleanContent}`;
          }
        } else {
          processedLines.push(cleanContent);
        }
      }
    }

    if (processedLines.length > 0) {
      structuredParagraphs.push(processedLines.join("\n"));
    }
  }

  return structuredParagraphs
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
