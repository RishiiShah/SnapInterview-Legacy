// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ResumeDocumentModal from "./ResumeDocumentModal";

describe("ResumeDocumentModal", () => {
  afterEach(() => {
    cleanup();
  });

  const sampleResume = `John Doe
john@example.com

Experienced full-stack engineer.

EXPERIENCE
Software Engineer
Acme Corp
2020 - 2023
- Built real-time streaming pipeline.
`;

  it("does not render when isOpen is false", () => {
    render(
      <ResumeDocumentModal
        isOpen={false}
        onClose={vi.fn()}
        resumeText={sampleResume}
        candidateName="John Doe"
      />,
    );
    expect(screen.queryByText("Resume Preview")).toBeNull();
  });

  it("renders document sheet when open", () => {
    const onClose = vi.fn();
    render(
      <ResumeDocumentModal
        isOpen={true}
        onClose={onClose}
        resumeText={sampleResume}
        candidateName="John Doe"
      />,
    );

    expect(screen.getByText("Resume Preview")).toBeTruthy();
    expect(screen.getByText("John Doe")).toBeTruthy();
    expect(screen.getByText(/john@example.com/)).toBeTruthy();
    expect(screen.getByText("Built real-time streaming pipeline.")).toBeTruthy();
  });


});
