import {
  matchSectionHeader,
  sanitizeResumeText,
  stripBulletMarkers,
  ACTION_VERB_REGEX,
  TRAILING_DATE_REGEX,
} from "@/lib/resume/sanitizer";

export type SkillCategory = {
  category: string;
  skills: string;
};

export type ResumeSectionItem = {
  heading?: string;
  subtitle?: string;
  date?: string;
  bullets: string[];
  text?: string;
};

export type ResumeSection = {
  title: string;
  skillCategories?: SkillCategory[];
  items: ResumeSectionItem[];
};

export type FormattedResumeDocument = {
  name: string;
  contactLines: string[];
  summary: string | null;
  sections: ResumeSection[];
  rawText: string;
  plainText: string;
  wordCount: number;
  charCount: number;
};

function isLikelyItemHeading(line: string, sectionTitle: string): boolean {
  if (
    sectionTitle.includes("ACHIEVEMENT") ||
    sectionTitle.includes("AWARD") ||
    sectionTitle.includes("CERTIF") ||
    sectionTitle.includes("ACTIVIT")
  ) {
    return false; // Achievements and activities are flat bullet lists
  }

  // If the line starts with an action verb, it is ALWAYS an accomplishment bullet, never a heading
  if (ACTION_VERB_REGEX.test(line)) {
    return false;
  }

  // Education/Experience: lines with trailing date ranges are headings
  if (sectionTitle.includes("EDUCATION") || sectionTitle.includes("EXPERIENCE")) {
    if (TRAILING_DATE_REGEX.test(line)) return true;
  }

  // Projects: lines with " – " / " - " / " | " separators are headings (tech stacks)
  if (sectionTitle.includes("PROJECT")) {
    if (line.includes(" – ") || line.includes(" - ") || line.includes(" | ")) {
      return true;
    }
  }

  // Short, non-punctuated, non-verb lines are likely headings
  if (line.length < 65 && !line.endsWith(".")) {
    return true;
  }

  return false;
}

export function generatePlainTextResume(
  name: string,
  contactLines: string[],
  summary: string | null,
  sections: ResumeSection[],
  fallbackText: string
): string {
  if (sections.length === 0 && !summary) {
    return fallbackText;
  }

  const parts: string[] = [];
  if (name) parts.push(name.toUpperCase());
  if (contactLines.length > 0) parts.push(contactLines.join("   |   "));
  parts.push("");

  if (summary) {
    parts.push("PROFESSIONAL SUMMARY");
    parts.push("────────────────────────────────────────────");
    parts.push(summary);
    parts.push("");
  }

  for (const sec of sections) {
    parts.push(sec.title);
    parts.push("────────────────────────────────────────────");

    if (sec.skillCategories && sec.skillCategories.length > 0) {
      for (const cat of sec.skillCategories) {
        parts.push(`${cat.category}: ${cat.skills}`);
      }
      parts.push("");
    }

    for (const item of sec.items) {
      if (item.heading || item.date) {
        const headingLine = [item.heading, item.date ? `(${item.date})` : ""].filter(Boolean).join("   -   ");
        parts.push(headingLine);
      }
      if (item.subtitle) {
        parts.push(`  ${item.subtitle}`);
      }
      if (item.text) {
        parts.push(`  ${item.text}`);
      }
      for (const bullet of item.bullets) {
        parts.push(`  • ${bullet}`);
      }
      parts.push("");
    }
  }

  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function parseResumeDocument(rawText: string, fallbackName = "Candidate"): FormattedResumeDocument {
  const sanitized = sanitizeResumeText(rawText);
  if (!sanitized) {
    return {
      name: fallbackName,
      contactLines: [],
      summary: null,
      sections: [],
      rawText: "",
      plainText: "",
      wordCount: 0,
      charCount: 0,
    };
  }

  const lines = sanitized.split("\n").map((l) => l.trim()).filter(Boolean);
  const wordCount = sanitized.split(/\s+/).filter(Boolean).length;
  const charCount = sanitized.length;

  let name = fallbackName;
  const contactLines: string[] = [];
  let summary: string | null = null;
  const sections: ResumeSection[] = [];

  let lineIdx = 0;
  // First line is candidate name if not a header
  const firstLine = lines[0] ?? "";
  if (
    firstLine &&
    !firstLine.startsWith("## ") &&
    !firstLine.includes("@") &&
    firstLine.length < 50
  ) {
    name = stripBulletMarkers(firstLine);
    lineIdx = 1;
  }

  // Parse contact info before the first section
  while (lineIdx < lines.length) {
    const line = lines[lineIdx] ?? "";
    if (line.startsWith("## ") || matchSectionHeader(line)) break;

    if (
      line.includes("@") ||
      line.includes("linkedin.com") ||
      line.includes("github.com") ||
      /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(line) ||
      line.includes("|")
    ) {
      contactLines.push(stripBulletMarkers(line));
      lineIdx++;
    } else {
      break;
    }
  }

  let currentSection: ResumeSection | null = null;
  let currentItem: ResumeSectionItem | null = null;

  function pushItem() {
    if (currentItem && currentSection) {
      if (currentItem.bullets.length > 0 || currentItem.heading || currentItem.text) {
        currentSection.items.push(currentItem);
      }
      currentItem = null;
    }
  }

  function pushSection() {
    pushItem();
    if (currentSection && (currentSection.items.length > 0 || (currentSection.skillCategories && currentSection.skillCategories.length > 0))) {
      sections.push(currentSection);
      currentSection = null;
    }
  }

  for (; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx] ?? "";
    if (!rawLine) continue;

    // Check for Section Header (## HEADER or plain HEADER)
    const isMarkdownHeader = rawLine.startsWith("## ");
    const sectionCandidate = isMarkdownHeader
      ? rawLine.replace(/^##\s+/, "").trim()
      : rawLine;
    const matchedHeader = matchSectionHeader(sectionCandidate);

    if (matchedHeader) {
      pushSection();
      currentSection = {
        title: matchedHeader,
        items: [],
      };
      if (matchedHeader.includes("SKILL")) {
        currentSection.skillCategories = [];
      }
      continue;
    }

    if (!currentSection) {
      // Intro summary before any section
      const cleanLine = stripBulletMarkers(rawLine);
      if (!summary) {
        summary = cleanLine;
      } else {
        summary += ` ${cleanLine}`;
      }
      continue;
    }

    const cleanLine = stripBulletMarkers(rawLine);
    if (!cleanLine) continue;

    // Check if in Skills section
    if (currentSection.title.includes("SKILL")) {
      const colonIdx = cleanLine.indexOf(":");
      if (colonIdx > 0 && colonIdx < 45) {
        const cat = cleanLine.slice(0, colonIdx).trim();
        const skillsList = cleanLine.slice(colonIdx + 1).trim();
        currentSection.skillCategories = currentSection.skillCategories ?? [];
        currentSection.skillCategories.push({
          category: cat,
          skills: skillsList,
        });
        continue;
      }
    }

    // If section is Achievements / Awards / Extra Curricular: it's a flat bullet list
    const isFlatListSection =
      currentSection.title.includes("ACHIEVEMENT") ||
      currentSection.title.includes("AWARD") ||
      currentSection.title.includes("ACTIVIT") ||
      currentSection.title.includes("CERTIF");

    if (isFlatListSection) {
      if (!currentItem) {
        currentItem = { bullets: [] };
      }
      currentItem.bullets.push(cleanLine);
      continue;
    }

    const isBullet = rawLine.startsWith("- ") || rawLine.startsWith("• ") || rawLine.startsWith("* ");
    const isHeadingCandidate = isLikelyItemHeading(cleanLine, currentSection.title);

    // If currentItem already has bullets and new line is a heading candidate (e.g. 2nd Project)
    if (currentItem && currentItem.bullets.length > 0 && isHeadingCandidate) {
      pushItem();
    }

    if (!currentItem?.heading && isHeadingCandidate) {
      // Extract trailing date from end of line (e.g. "Office of IT, Rutgers University September 2025 – Present")
      const trailingDateMatch = cleanLine.match(TRAILING_DATE_REGEX);
      const dateStr = trailingDateMatch ? trailingDateMatch[0].replace(/^[\s|,]+/, "").trim() : undefined;
      let headingText = dateStr ? cleanLine.slice(0, cleanLine.lastIndexOf(dateStr)).replace(/[\s|,–—]+$/, "").trim() : cleanLine;

      let subtitleText: string | undefined;
      if (!dateStr && (headingText.includes(" – ") || headingText.includes(" - "))) {
        const splitPattern = headingText.includes(" – ") ? " – " : " - ";
        const [h, ...rest] = headingText.split(splitPattern);
        if (h && rest.length > 0) {
          headingText = h.trim();
          subtitleText = rest.join(splitPattern).trim();
        }
      }

      currentItem = {
        heading: headingText,
        subtitle: subtitleText,
        date: dateStr,
        bullets: [],
      };
      continue;
    }

    if (isBullet || ACTION_VERB_REGEX.test(cleanLine)) {
      if (!currentItem) {
        currentItem = { bullets: [] };
      }
      currentItem.bullets.push(cleanLine);
    } else {
      // Line is a title / date / subtitle for the current item
      const trailingDateMatch = cleanLine.match(TRAILING_DATE_REGEX);
      if (trailingDateMatch && !ACTION_VERB_REGEX.test(cleanLine)) {
        pushItem();
        const dateStr = trailingDateMatch[0].replace(/^[\s|,]+/, "").trim();
        const headingStr = cleanLine.slice(0, cleanLine.lastIndexOf(dateStr)).replace(/[\s|,–—]+$/, "").trim();
        currentItem = {
          heading: headingStr || cleanLine,
          date: dateStr,
          bullets: [],
        };
      } else if (!currentItem?.heading && !ACTION_VERB_REGEX.test(cleanLine)) {
        pushItem();
        currentItem = {
          heading: cleanLine,
          bullets: [],
        };
      } else if (!currentItem?.subtitle && currentItem?.bullets.length === 0) {
        if (!currentItem) currentItem = { bullets: [] };
        currentItem.subtitle = cleanLine;
      } else {
        if (!currentItem) currentItem = { bullets: [] };
        if (!currentItem.text && currentItem.bullets.length === 0) {
          currentItem.text = cleanLine;
        } else {
          currentItem.bullets.push(cleanLine);
        }
      }
    }
  }

  pushSection();

  const plainText = generatePlainTextResume(name, contactLines, summary, sections, sanitized);

  return {
    name,
    contactLines,
    summary,
    sections,
    rawText: sanitized,
    plainText,
    wordCount,
    charCount,
  };
}
