"use client";

import { useState, useEffect } from "react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type ProfileTabProps = {
  userName: string;
  userEmail: string;
  userImage?: string | null;
  initials: string;
};

const darkInput =
  "w-full border-b border-white/[0.12] bg-transparent px-0 py-2.5 text-[15px] text-[#F2F4F8] outline-none placeholder:text-[#6B7385] transition-colors focus:border-[#3B82F6] disabled:cursor-not-allowed disabled:text-[#A8B0C2]";

export default function ProfileTab({ userName, userEmail, userImage, initials }: ProfileTabProps) {
  const router = useRouter();
  const [name, setName] = useState(userName);
  const [savedName, setSavedName] = useState(userName);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [resumeText, setResumeText] = useState<string | null>(null);
  const [resumeExpanded, setResumeExpanded] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [resumeClearing, setResumeClearing] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/resume")
      .then((res) => (res.ok ? (res.json() as Promise<{ resumeText: string | null }>) : null))
      .then((data) => {
        if (!cancelled) setResumeText(data?.resumeText ?? null);
      })
      .catch(() => {
        if (!cancelled) setResumeText(null);
      })
      .finally(() => {
        if (!cancelled) setResumeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    const formData = new FormData();
    formData.append("resume", file);
    try {
      const res = await fetch("/api/resume/parse", { method: "POST", body: formData });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to process resume");
      }
      const data = (await res.json()) as { resumeText: string };
      setResumeText(data.resumeText);
      setResumeExpanded(false);
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
      setResumeExpanded(false);
      setConfirmingClear(false);
    } catch {
      setResumeError("Failed to clear resume. Please try again.");
    } finally {
      setResumeClearing(false);
    }
  }

  const wordCount = resumeText ? resumeText.trim().split(/\s+/).filter(Boolean).length : 0;

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
          <label className="mb-1.5 block text-[12px] font-medium text-[#A8B0C2]">Email</label>
          <input type="email" value={userEmail} disabled className={darkInput} />
          <p className="mt-1.5 text-xs text-[#6B7385]">Email cannot be changed.</p>
        </div>
      </div>
      {profileError && <p className="text-sm text-rose-400">{profileError}</p>}

      <div className="pt-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[15px] font-medium text-[#F2F4F8]">Saved resume</h3>
            <p className="mt-1 text-xs text-[#A8B0C2]">
              Used to personalize AI interview questions. PDF only, max 5 MB.
            </p>
          </div>
          {!resumeLoading && !resumeUploading && resumeText && (
            <button
              type="button"
              onClick={() => setResumeExpanded((v) => !v)}
              className="cursor-pointer shrink-0 text-xs text-[#A8B0C2] transition-colors hover:text-[#C5CBD8]"
            >
              {resumeExpanded ? "Collapse" : "View"}
            </button>
          )}
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
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.12] pb-2.5">
                <div>
                  <p className="text-[15px] text-[#F2F4F8]">Resume saved</p>
                  <p className="mt-0.5 text-[12px] text-[#93C5FD]">
                    Parsed · {wordCount.toLocaleString()} words
                  </p>
                </div>
              </div>

              {resumeExpanded && (
                <textarea
                  readOnly
                  value={resumeText}
                  rows={12}
                  className="w-full resize-none border border-white/[0.08] bg-white/[0.02] px-4 py-3 font-mono text-xs leading-relaxed text-[#C5CBD8] focus:outline-none"
                />
              )}

              {uploadError && <p className="text-xs text-rose-400">{uploadError}</p>}
              {resumeError && <p className="text-xs text-rose-400">{resumeError}</p>}

              <div className="flex items-center gap-4">
                <label className="cursor-pointer text-xs text-[#60A5FA] transition-colors hover:text-[#93C5FD]">
                  Replace PDF
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
                  <p className="mt-0.5 text-[12px] text-[#A8B0C2]">PDF only · max 5 MB</p>
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

      <div className="flex items-center gap-3 pt-4">
        <Button
          onClick={handleSaveProfile}
          disabled={name.trim() === savedName.trim()}
          loading={profileSaving}
          className="!bg-[#3B82F6] hover:!bg-[#4B8FF7] !shadow-none"
        >
          {profileSaving ? "Saving…" : "Save changes"}
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
    </div>
  );
}
