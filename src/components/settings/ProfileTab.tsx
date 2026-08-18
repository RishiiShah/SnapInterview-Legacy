"use client";

import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import ResumeDocumentModal from "@/components/resume/ResumeDocumentModal";
import {
  MAX_RESUME_PDF_LABEL,
  uploadResumeFile,
} from "@/lib/resume-upload";

type ProfileTabProps = {
  userName: string;
  userEmail: string;
  userImage?: string | null;
  initials: string;
  /** `undefined` retains standalone client-fetch behavior; `null` means the server loaded no resume. */
  initialResumeText?: string | null;
};

const darkInput =
  "w-full border-b border-white/[0.12] bg-transparent px-0 py-2.5 text-[15px] text-[#F2F4F8] outline-none placeholder:text-[#6B7385] transition-colors focus:border-[#3B82F6] disabled:cursor-not-allowed disabled:text-[#A8B0C2]";

export default function ProfileTab({
  userName,
  userEmail,
  userImage,
  initials,
  initialResumeText,
}: ProfileTabProps) {
  const router = useRouter();
  const [name, setName] = useState(userName);
  const [savedName, setSavedName] = useState(userName);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [resumeText, setResumeText] = useState<string | null>(initialResumeText ?? null);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(initialResumeText === undefined);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [resumeClearing, setResumeClearing] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const resumeRequestRef = useRef<Promise<{ resumeText: string | null } | null> | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialResumeText !== undefined) {
      return;
    }

    let cancelled = false;
    const request =
      resumeRequestRef.current ??
      fetch("/api/resume")
        .then((res) =>
          res.ok ? (res.json() as Promise<{ resumeText: string | null }>) : null,
        )
        .catch(() => null);

    resumeRequestRef.current = request;
    void request.finally(() => {
      if (resumeRequestRef.current === request) {
        resumeRequestRef.current = null;
      }
    });

    void request
      .then((data) => {
        if (!cancelled) setResumeText(data?.resumeText ?? null);
      })
      .finally(() => {
        if (!cancelled) setResumeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialResumeText]);

  async function handleSaveProfile() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setProfileError("Display name is required.");
      return;
    }

    setProfileSaving(true);
    setProfileSaved(false);
    setProfileError(null);

    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileError(typeof data?.error === "string" ? data.error : "Failed to update profile.");
        return;
      }

      const nextName = data?.user?.name ?? trimmedName;
      setName(nextName);
      setSavedName(nextName);
      router.refresh();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch {
      setProfileError("Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleResumeUpload(file: File) {
    setResumeUploading(true);
    setUploadError(null);
    try {
      setResumeText(await uploadResumeFile(file));
      setConfirmingClear(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to process resume");
    } finally {
      setResumeUploading(false);
    }
  }

  async function handleClearResume() {
    setResumeClearing(true);
    setResumeError(null);
    try {
      const res = await fetch("/api/resume", { method: "DELETE" });
      if (!res.ok) {
        setResumeError("Failed to clear resume. Please try again.");
        return;
      }
      setResumeText(null);
      setConfirmingClear(false);
    } catch {
      setResumeError("Failed to clear resume. Please try again.");
    } finally {
      setResumeClearing(false);
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-display text-xl tracking-tight text-[#F2F4F8]">Profile</h2>
        <p className="mt-1.5 text-sm text-[#A8B0C2]">
          Update your personal information and how others see you.
        </p>
      </div>

      <div className="flex items-center gap-5">
        <div className="group relative">
          {userImage ? (
            <UserAvatar
              src={userImage}
              alt={savedName}
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover ring-1 ring-white/[0.08]"
            />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#3B82F6]/15 text-lg font-medium text-[#93C5FD] ring-1 ring-white/[0.08]">
              {initials}
            </div>
          )}
        </div>
        <div>
          <p className="text-[15px] font-medium text-[#F2F4F8]">{savedName}</p>
          <p className="text-sm text-[#A8B0C2]">{userEmail}</p>
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[#A8B0C2]">Display name</label>
          <input
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (profileError) setProfileError(null);
            }}
            className={darkInput}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[#A8B0C2]">
            Email <span className="font-normal text-[#6B7385]">(cannot be changed)</span>
          </label>
          <input type="email" value={userEmail} disabled className={darkInput} />
        </div>
      </div>
      {profileError && <p className="text-sm text-rose-400">{profileError}</p>}

      <div className="pt-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[15px] font-medium text-[#F2F4F8]">Saved resume</h3>
            <p className="mt-1 text-xs text-[#A8B0C2]">
              Used to personalize AI interview questions. PDF only, max {MAX_RESUME_PDF_LABEL}.
            </p>
          </div>
        </div>

        <div className="mt-5">
          {resumeLoading ? (
            <div className="flex h-10 items-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/[0.15] border-t-[#3B82F6]" />
            </div>
          ) : resumeUploading ? (
            <div className="flex items-center gap-3 border-b border-white/[0.12] py-2.5">
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#3B82F6]/30 border-t-[#3B82F6]" />
              <span className="text-sm text-[#A8B0C2]">Processing PDF…</span>
            </div>
          ) : resumeText ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 border-b border-[#3B82F6]/30 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-medium text-[#F2F4F8]">Resume saved</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                      ✓ Auto-saved & synced
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-[#93C5FD]">
                    Ready for interviews
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setResumeModalOpen(true)}
                    className="cursor-pointer rounded border border-[#3B82F6]/40 bg-[#3B82F6]/10 px-3 py-1 text-xs font-medium text-[#60A5FA] transition-colors hover:bg-[#3B82F6]/20"
                  >
                    📄 View document
                  </button>
                </div>
              </div>

              {uploadError && <p className="text-xs text-rose-400">{uploadError}</p>}
              {resumeError && <p className="text-xs text-rose-400">{resumeError}</p>}

              <div className="flex items-center gap-4 pt-1">
                <label className="cursor-pointer text-xs font-medium text-[#60A5FA] transition-colors hover:text-[#93C5FD]">
                  Replace PDF
                  <input
                    ref={replaceInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        e.target.value = "";
                        void handleResumeUpload(file);
                      }
                    }}
                  />
                </label>
                <span className="text-white/[0.12]">|</span>
                {!confirmingClear ? (
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(true)}
                    className="cursor-pointer text-xs text-rose-400 transition-colors hover:text-rose-300"
                  >
                    Clear saved resume
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#A8B0C2]">Remove your saved resume?</span>
                    <button
                      type="button"
                      onClick={() => setConfirmingClear(false)}
                      className="cursor-pointer text-xs text-[#A8B0C2] hover:text-[#C5CBD8]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleClearResume}
                      disabled={resumeClearing}
                      className="cursor-pointer text-xs font-medium text-rose-400 hover:text-rose-300 disabled:opacity-50"
                    >
                      {resumeClearing ? "Clearing…" : "Yes, clear it"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {uploadError && <p className="text-xs text-rose-400">{uploadError}</p>}
              <label className="group flex cursor-pointer items-center justify-between border-b border-white/[0.12] pb-2.5 transition-colors">
                <div>
                  <p className="text-[15px] text-[#E8ECF4] transition-colors group-hover:text-[#F2F4F8]">
                    Upload resume
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#A8B0C2]">PDF only · max {MAX_RESUME_PDF_LABEL} · Auto-saves on upload</p>
                </div>
                <span className="text-sm text-[#60A5FA] transition-colors group-hover:text-[#93C5FD]">
                  Browse
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      e.target.value = "";
                      void handleResumeUpload(file);
                    }
                  }}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 pt-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveProfile}
            disabled={name.trim() === savedName.trim()}
            loading={profileSaving}
            className="!bg-[#3B82F6] hover:!bg-[#4B8FF7] !shadow-none"
          >
            {profileSaving ? "Saving…" : "Save profile changes"}
          </Button>
          {profileSaved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Saved
            </span>
          )}
        </div>
        <p className="text-[12px] text-[#8B93A7]">
          Display name changes require saving. Uploaded resumes save automatically.
        </p>
      </div>

      {resumeText ? (
        <ResumeDocumentModal
          isOpen={resumeModalOpen}
          onClose={() => setResumeModalOpen(false)}
          resumeText={resumeText}
          candidateName={savedName || userName}
          onReplace={() => replaceInputRef.current?.click()}
        />
      ) : null}
    </div>
  );
}
