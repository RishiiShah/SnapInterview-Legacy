import { describe, expect, it } from "vitest";
import { generateResumePdfBlob } from "./pdf-generator";
import { parseResumeDocument } from "@/lib/interview/resume-formatter";

describe("PDF Generator", () => {
  it("generates a valid application/pdf Blob with %PDF header", async () => {
    const raw = `John Doe
john@example.com

EDUCATION
State University 2020 - 2024
B.S. Computer Science

EXPERIENCE
Acme Corp 2024 - Present
Software Engineer
- Built high-performance backend.
`;

    const doc = parseResumeDocument(raw, "John Doe");
    const blob = generateResumePdfBlob(doc);

    expect(blob).toBeTruthy();
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(500);

    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const header = String.fromCharCode(...bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });
});
