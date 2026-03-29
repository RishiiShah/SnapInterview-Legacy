"use client";

import { useState } from "react";
import Image from "next/image";
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
              <Image src={userImage} alt={savedName} width={72} height={72} className="h-18 w-18 rounded-full object-cover ring-4 ring-zinc-100" />
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

      <div className="px-8 py-6 space-y-5">
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

      <div className="flex items-center gap-3 border-t border-zinc-100 px-8 py-5">
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
