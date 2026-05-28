"use client";

import { useState, useEffect } from "react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type ProfileTabProps = {
  userName: string;
  userEmail: string;
  userImage?: string | null;
  initials: string;
};

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
    return () => { cancelled = true; };
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
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to process resume");
      }
      const data = await res.json() as { resumeText: string };
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
    <div>
      <div className="border-b border-zinc-100 px-8 py-6">
        <h2 className="text-lg font-semibold text-zinc-900">Profile</h2>
        <p className="mt-1 text-sm text-zinc-500">Update your personal information and how others see you.</p>
      </div>

      <div className="border-b border-zinc-100 px-8 py-6">
        <div className="flex items-center gap-5">
          <div className="relative group">
            {userImage ? (
              <UserAvatar src={userImage} alt={savedName} width={72} height={72} className="h-18 w-18 rounded-full object-cover ring-4 ring-zinc-100" />
            ) : (
              <div className="grid h-18 w-18 place-items-center rounded-full bg-zinc-900 text-xl font-bold text-white ring-4 ring-zinc-100">{initials}</div>
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-zinc-900/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-base font-semibold text-zinc-900">{savedName}</p>
            <p className="text-sm text-zinc-400">{userEmail}</p>
            <p className="mt-1.5 text-xs text-zinc-400">Click avatar to upload a new photo</p>
          </div>
        </div>
      </div>

      <div className="border-b border-zinc-100 px-8 py-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Display Name</label>
            <Input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (profileError) setProfileError(null);
              }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Email</label>
            <Input type="email" value={userEmail} disabled />
            <p className="mt-1 text-xs text-zinc-400">Email cannot be changed.</p>
          </div>
        </div>
        {profileError && <p className="text-sm text-red-600">{profileError}</p>}
      </div>

      {/* Resume Section */}
      <div className="border-b border-zinc-100 px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-zinc-900">Saved Resume</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Used to personalize AI interview questions. PDF only, max 5 MB.
            </p>
          </div>
          {!resumeLoading && !resumeUploading && resumeText && (
            <button
              onClick={() => setResumeExpanded((v) => !v)}
              className="shrink-0 text-xs text-zinc-500 hover:text-zinc-700 transition-colors flex items-center gap-1"
            >
              {resumeExpanded ? "Collapse" : "View"}
              <svg
                className={`h-3.5 w-3.5 transition-transform ${resumeExpanded ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        <div className="mt-4">
          {resumeLoading ? (
            <div className="h-10 flex items-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
            </div>
          ) : resumeUploading ? (
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600 shrink-0" />
              <span className="text-sm text-zinc-600">Processing PDF…</span>
            </div>
          ) : resumeText ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <svg className="h-4 w-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="text-xs font-medium text-zinc-700">Resume saved</span>
                  <span className="text-xs text-zinc-400">&middot; {wordCount.toLocaleString()} words</span>
                </div>
              </div>

              {resumeExpanded && (
                <textarea
                  readOnly
                  value={resumeText}
                  rows={12}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-700 font-mono leading-relaxed resize-none focus:outline-none"
                />
              )}

              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
              {resumeError && <p className="text-xs text-red-600">{resumeError}</p>}

              <div className="flex items-center gap-4">
                <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 transition-colors">
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
                <span className="text-zinc-200">|</span>
                {!confirmingClear ? (
                  <button
                    onClick={() => setConfirmingClear(true)}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Clear saved resume
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600">Remove your saved resume?</span>
                    <button
                      onClick={() => setConfirmingClear(false)}
                      className="text-xs text-zinc-500 hover:text-zinc-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearResume}
                      disabled={resumeClearing}
                      className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {resumeClearing ? "Clearing…" : "Yes, clear it"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
              <label className="group flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 transition-colors hover:border-blue-400 hover:bg-blue-50/40">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-zinc-200 transition-colors group-hover:bg-blue-50 group-hover:ring-blue-200">
                    <svg className="h-4 w-4 text-zinc-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-700 group-hover:text-blue-700 transition-colors">Upload Resume</p>
                    <p className="text-xs text-zinc-400">PDF only · max 5 MB</p>
                  </div>
                </div>
                <span className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-700">
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

      <div className="flex items-center gap-3 px-8 py-5">
        <Button
          onClick={handleSaveProfile}
          disabled={name.trim() === savedName.trim()}
          loading={profileSaving}
        >
          {profileSaving ? "Saving…" : "Save Changes"}
        </Button>
        {profileSaved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            Saved successfully
          </span>
        )}
      </div>
    </div>
  );
}
