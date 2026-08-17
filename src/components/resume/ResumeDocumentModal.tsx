"use client";

import { useEffect, useState, useMemo } from "react";
import { parseResumeDocument } from "@/lib/interview/resume-formatter";
import { downloadResumePdf } from "@/lib/resume/pdf-generator";
import ResumeDocumentSheet from "./ResumeDocumentSheet";

type ResumeDocumentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  resumeText: string;
  candidateName?: string;
  onReplace?: () => void;
};

export default function ResumeDocumentModal({
  isOpen,
  onClose,
  resumeText,
  candidateName = "Candidate",
  onReplace,
}: ResumeDocumentModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const doc = useMemo(
    () => parseResumeDocument(resumeText, candidateName),
    [resumeText, candidateName],
  );

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(doc.plainText || resumeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function handleExportPdf() {
    setDownloading(true);
    try {
      downloadResumePdf(doc);
    } finally {
      setTimeout(() => setDownloading(false), 1000);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0B0C10]/85 p-2 sm:p-3 md:p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-modal-title"
    >
      <div
        className="relative flex h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12141C] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3B82F6]/15 text-sm text-[#60A5FA]">
              📄
            </span>
            <h2 id="resume-modal-title" className="text-[15px] font-medium tracking-tight text-[#F2F4F8]">
              Resume Preview
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Direct PDF Download / Export Button */}
            <button
              type="button"
              onClick={handleExportPdf}
              title="Download PDF"
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-medium text-[#E8ECF4] transition-colors hover:bg-white/[0.08]"
            >
              {downloading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  <span>Downloading…</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span>Export PDF</span>
                </>
              )}
            </button>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-medium text-[#E8ECF4] transition-colors hover:bg-white/[0.08]"
            >
              {copied ? (
                <>
                  <span className="text-emerald-400">✓</span>
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>

            {onReplace ? (
              <button
                type="button"
                onClick={onReplace}
                className="hidden h-8 cursor-pointer items-center rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/15 px-3 text-xs font-medium text-[#60A5FA] transition-colors hover:bg-[#3B82F6]/25 sm:inline-flex"
              >
                Replace PDF
              </button>
            ) : null}

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#A8B0C2] transition-colors hover:bg-white/[0.06] hover:text-[#E8ECF4]"
              aria-label="Close modal"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto bg-[#0A0C10] p-2 sm:p-4 md:p-6">
          <ResumeDocumentSheet doc={doc} />
        </div>
      </div>
    </div>
  );
}
