import type { FormattedResumeDocument } from "@/lib/interview/resume-formatter";

/**
 * Pure TypeScript client-side PDF generator (PDF 1.4 spec).
 * Generates a clean, professional, downloadable .pdf file directly in the browser
 * with zero external dependencies.
 */

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + " " + word).length <= maxCharsPerLine) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

function textOp(font: string, size: number, rgb: string, x: number, y: number, text: string): string {
  return `BT /${font} ${size} Tf ${rgb} rg 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`;
}

function lineOp(x1: number, y: number, x2: number, gray = "0.85 0.85 0.85", width = 0.5): string {
  return `${gray} RG ${width} w ${x1} ${y} m ${x2} ${y} l S 0 g 0 G`;
}

export function generateResumePdfBlob(doc: FormattedResumeDocument): Blob {
  const pageWidth = 612; // Letter width in pt
  const pageHeight = 792; // Letter height in pt
  const margin = 40;
  const maxLineChars = 88;
  const maxBulletChars = 82;

  const streamOps: string[] = [];
  let y = pageHeight - margin; // Start from top

  // 1. Candidate Name
  const cleanName = doc.name || "Candidate Resume";
  streamOps.push(textOp("F1", 20, "0 0 0", margin, y, cleanName));
  y -= 22;

  // 2. Contact Information
  if (doc.contactLines.length > 0) {
    const contactText = doc.contactLines.join("   |   ");
    streamOps.push(textOp("F2", 9, "0.3 0.3 0.3", margin, y, contactText));
    y -= 16;
  }

  // Divider below header
  streamOps.push(lineOp(margin, y, pageWidth - margin, "0.8 0.8 0.8", 0.75));
  y -= 18;

  // 3. Summary
  if (doc.summary) {
    streamOps.push(textOp("F1", 11, "0.1 0.1 0.1", margin, y, "PROFESSIONAL SUMMARY"));
    y -= 4;
    streamOps.push(lineOp(margin, y, pageWidth - margin));
    y -= 12;

    for (const sLine of wrapText(doc.summary, maxLineChars)) {
      streamOps.push(textOp("F2", 9.5, "0.2 0.2 0.2", margin, y, sLine));
      y -= 13;
    }
    y -= 8;
  }

  // 4. Sections
  for (const sec of doc.sections) {
    if (y < margin + 60) break; // Keep within single page

    // Section Title
    streamOps.push(textOp("F1", 11, "0.1 0.1 0.1", margin, y, sec.title));
    y -= 4;
    streamOps.push(lineOp(margin, y, pageWidth - margin));
    y -= 14;

    // Skill Categories
    if (sec.skillCategories && sec.skillCategories.length > 0) {
      for (const cat of sec.skillCategories) {
        if (y < margin + 20) break;
        const catLabel = `${cat.category}: `;
        const catSkills = cat.skills;
        const skillLines = wrapText(`${catLabel}${catSkills}`, maxLineChars);

        for (let i = 0; i < skillLines.length; i++) {
          const sLine = skillLines[i] ?? "";
          if (i === 0) {
            streamOps.push(`BT /F1 9.5 Tf 0.1 0.1 0.1 rg 1 0 0 1 ${margin} ${y} Tm (${escapePdfText(catLabel)}) Tj /F2 9.5 Tf 0.25 0.25 0.25 rg (${escapePdfText(catSkills)}) Tj ET`);
          } else {
            streamOps.push(textOp("F2", 9.5, "0.25 0.25 0.25", margin + 10, y, sLine));
          }
          y -= 13;
        }
      }
      y -= 6;
    }

    // Section Items (Experience / Projects / Education / Achievements)
    for (const item of sec.items) {
      if (y < margin + 25) break;

      // Heading and Date
      if (item.heading || item.date) {
        const heading = item.heading || "";
        streamOps.push(textOp("F1", 10, "0.1 0.1 0.1", margin, y, heading));

        if (item.date) {
          const dateApproxWidth = item.date.length * 5.2;
          const dateX = Math.max(margin + 200, pageWidth - margin - dateApproxWidth);
          streamOps.push(textOp("F2", 9, "0.45 0.45 0.45", dateX, y, item.date));
        }
        y -= 13;
      }

      // Subtitle
      if (item.subtitle) {
        streamOps.push(textOp("F3", 9.5, "0.35 0.35 0.35", margin, y, item.subtitle));
        y -= 12;
      }

      // Text line
      if (item.text) {
        for (const tLine of wrapText(item.text, maxLineChars)) {
          streamOps.push(textOp("F2", 9, "0.25 0.25 0.25", margin, y, tLine));
          y -= 12;
        }
      }

      // Bullets
      if (item.bullets.length > 0) {
        for (const bullet of item.bullets) {
          if (y < margin + 15) break;
          const bLines = wrapText(bullet, maxBulletChars);
          for (let bIdx = 0; bIdx < bLines.length; bIdx++) {
            const bLine = bLines[bIdx] ?? "";
            if (bIdx === 0) {
              streamOps.push(`BT /F2 9 Tf 0.2 0.2 0.2 rg 1 0 0 1 ${margin + 6} ${y} Tm (\\225  ${escapePdfText(bLine)}) Tj ET`);
            } else {
              streamOps.push(textOp("F2", 9, "0.2 0.2 0.2", margin + 18, y, bLine));
            }
            y -= 12;
          }
          y -= 2;
        }
      }

      y -= 6;
    }

    y -= 6;
  }

  const streamContent = streamOps.join("\n");
  const streamLength = Buffer.byteLength(streamContent, "utf-8");

  // Construct standard PDF structure
  const pdfBody = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
7 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>
endobj
xref
0 8
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000252 00000 n 
000000${String(300 + streamLength).padStart(4, "0")} 00000 n 
000000${String(380 + streamLength).padStart(4, "0")} 00000 n 
000000${String(455 + streamLength).padStart(4, "0")} 00000 n 
trailer
<< /Size 8 /Root 1 0 R >>
startxref
${540 + streamLength}
%%EOF`;

  return new Blob([pdfBody], { type: "application/pdf" });
}

export function downloadResumePdf(doc: FormattedResumeDocument, filename?: string) {
  const blob = generateResumePdfBlob(doc);
  const safeFilename = filename || `${(doc.name || "Resume").replace(/[^a-zA-Z0-9_-]+/g, "_")}_Resume.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
