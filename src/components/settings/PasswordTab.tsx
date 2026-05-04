"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )}
    </button>
  );
}

export default function PasswordTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: "", color: "" };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    const colors = ["", "bg-red-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"];
    return { score, label: labels[score], color: colors[score] };
  }, [newPassword]);

  async function handleChangePassword() {
    setPasswordError("");
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      setPasswordError("Password must contain uppercase, lowercase, number, and special character.");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Failed to update password.");
      } else {
        setPasswordSaved(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSaved(false), 2000);
      }
    } catch {
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div>
      <div className="border-b border-zinc-100 px-8 py-6">
        <h2 className="text-lg font-semibold text-zinc-900">Change Password</h2>
        <p className="mt-1 text-sm text-zinc-500">Update your password to keep your account secure. Other active devices will be signed out.</p>
      </div>

      <div className="px-8 py-6 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">Current Password</label>
          <div className="relative">
            <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-11 text-sm text-zinc-900 outline-none transition-all focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100" />
            <EyeToggle show={showCurrentPassword} onToggle={() => setShowCurrentPassword(!showCurrentPassword)} />
          </div>
        </div>

        <div className="h-px bg-zinc-100" />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">New Password</label>
          <div className="relative">
            <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-11 text-sm text-zinc-900 outline-none transition-all focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100" />
            <EyeToggle show={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)} />
          </div>
          {newPassword && (
            <div className="mt-2.5 space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((index) => (
                  <div key={index} className={`h-1 flex-1 rounded-full transition-all duration-300 ${index <= passwordStrength.score ? passwordStrength.color : "bg-zinc-100"}`} />
                ))}
              </div>
              <p className="text-[11px] text-zinc-400">{passwordStrength.label}</p>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">Confirm New Password</label>
          <div className="relative">
            <input type={showConfirmNewPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-11 text-sm text-zinc-900 outline-none transition-all focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100" />
            <EyeToggle show={showConfirmNewPassword} onToggle={() => setShowConfirmNewPassword(!showConfirmNewPassword)} />
          </div>
          {confirmPassword && (
            <p className={`mt-2 text-[11px] flex items-center gap-1 ${confirmPassword === newPassword ? "text-emerald-600" : "text-red-500"}`}>
              {confirmPassword === newPassword ? (
                <><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> Passwords match</>
              ) : (
                <><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> Passwords don&apos;t match</>
              )}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-zinc-50 p-4">
          <p className="text-xs font-medium text-zinc-500 mb-2">Password requirements:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { rule: "At least 8 characters", met: newPassword.length >= 8 },
              { rule: "One uppercase letter", met: /[A-Z]/.test(newPassword) },
              { rule: "One number", met: /[0-9]/.test(newPassword) },
              { rule: "One special character", met: /[^A-Za-z0-9]/.test(newPassword) },
            ].map((req) => (
              <p key={req.rule} className={`text-[11px] flex items-center gap-1.5 ${!newPassword ? "text-zinc-400" : req.met ? "text-emerald-600" : "text-zinc-400"}`}>
                <span className={`inline-block h-1 w-1 rounded-full ${!newPassword ? "bg-zinc-300" : req.met ? "bg-emerald-500" : "bg-zinc-300"}`} />
                {req.rule}
              </p>
            ))}
          </div>
        </div>
      </div>

      {passwordError && (
        <div className="mx-8 mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          {passwordError}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-zinc-100 px-8 py-5">
        <Button onClick={handleChangePassword} disabled={!currentPassword || !newPassword} loading={passwordSaving}>
          {passwordSaving ? "Updating…" : "Update Password"}
        </Button>
        {passwordSaved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            Password updated
          </span>
        )}
      </div>
    </div>
  );
}
