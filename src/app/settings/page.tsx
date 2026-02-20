"use client";

import { useState } from "react";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getInitials } from "@/utils/helpers";

export default function SettingsPage() {
    const { data: session } = useSession();
    const userName = session?.user?.name || "";
    const userEmail = session?.user?.email || "";
    const userImage = session?.user?.image;
    const initials = getInitials(userName || "U");

    // Profile state
    const [name, setName] = useState(userName);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);

    // Password state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordSaved, setPasswordSaved] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

    // Notification prefs
    const [emailNotifs, setEmailNotifs] = useState(true);
    const [practiceReminders, setPracticeReminders] = useState(true);
    const [weeklyReport, setWeeklyReport] = useState(true);
    const [scoreAlerts, setScoreAlerts] = useState(false);

    // Delete account
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState("");

    async function handleSaveProfile() {
        setProfileSaving(true);
        // TODO: API call to update user profile
        await new Promise((r) => setTimeout(r, 800));
        setProfileSaving(false);
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 2000);
    }

    async function handleChangePassword() {
        setPasswordError("");
        if (newPassword.length < 8) { setPasswordError("Password must be at least 8 characters."); return; }
        if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match."); return; }
        if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
            setPasswordError("Password must contain uppercase, lowercase, number, and special character."); return;
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
                setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
                setTimeout(() => setPasswordSaved(false), 2000);
            }
        } catch {
            setPasswordError("Something went wrong. Please try again.");
        } finally {
            setPasswordSaving(false);
        }
    }

    async function handleDeleteAccount() {
        if (deleteConfirm !== "DELETE") return;
        try {
            const res = await fetch("/api/delete-account", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirm: "DELETE" }),
            });
            if (res.ok) {
                await signOut({ callbackUrl: "/" });
            }
        } catch {
            // If something goes wrong, close the modal
            setDeleteOpen(false);
            setDeleteConfirm("");
        }
    }

    return (
        <DashboardShell>
            <div className="mx-auto max-w-2xl space-y-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Settings</h1>
                    <p className="mt-1 text-sm text-zinc-500">Manage your account and preferences.</p>
                </div>

                {/* ── Profile ── */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                    <h2 className="mb-6 text-lg font-semibold text-zinc-900">Profile</h2>
                    <div className="flex items-center gap-5 mb-6">
                        {userImage ? (
                            <Image src={userImage} alt={userName} width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
                        ) : (
                            <div className="grid h-16 w-16 place-items-center rounded-full bg-zinc-900 text-lg font-bold text-white">{initials}</div>
                        )}
                        <div>
                            <p className="text-sm font-medium text-zinc-900">{userName}</p>
                            <p className="text-xs text-zinc-400">{userEmail}</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Display Name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100" />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Email</label>
                            <input type="email" value={userEmail} disabled
                                className="w-full rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm text-zinc-500 cursor-not-allowed" />
                            <p className="mt-1 text-xs text-zinc-400">Email cannot be changed.</p>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-3">
                        <button onClick={handleSaveProfile} disabled={profileSaving}
                            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-700 disabled:opacity-50">
                            {profileSaving ? "Saving…" : "Save Changes"}
                        </button>
                        {profileSaved && <span className="text-sm text-emerald-600">✓ Saved</span>}
                    </div>
                </div>

                {/* ── Password ── */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                    <h2 className="mb-6 text-lg font-semibold text-zinc-900">Change Password</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Current Password</label>
                            <div className="relative">
                                <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-11 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100" />
                                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}>
                                    {showCurrentPassword ? (
                                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-zinc-700">New Password</label>
                            <div className="relative">
                                <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-11 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100" />
                                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                                    aria-label={showNewPassword ? "Hide password" : "Show password"}>
                                    {showNewPassword ? (
                                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Confirm New Password</label>
                            <div className="relative">
                                <input type={showConfirmNewPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-11 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100" />
                                <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                                    aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}>
                                    {showConfirmNewPassword ? (
                                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                    {passwordError && <p className="mt-3 text-sm text-red-600">{passwordError}</p>}
                    <div className="mt-6 flex items-center gap-3">
                        <button onClick={handleChangePassword} disabled={passwordSaving || !currentPassword || !newPassword}
                            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            {passwordSaving ? "Updating…" : "Update Password"}
                        </button>
                        {passwordSaved && <span className="text-sm text-emerald-600">✓ Password updated</span>}
                    </div>
                </div>

                {/* ── Notification Preferences ── */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                    <h2 className="mb-6 text-lg font-semibold text-zinc-900">Notification Preferences</h2>
                    <div className="space-y-4">
                        {[
                            { label: "Email notifications", desc: "Receive updates about your account via email", value: emailNotifs, set: setEmailNotifs },
                            { label: "Practice reminders", desc: "Get daily reminders to practice", value: practiceReminders, set: setPracticeReminders },
                            { label: "Weekly report", desc: "Receive a weekly summary of your progress", value: weeklyReport, set: setWeeklyReport },
                            { label: "Score alerts", desc: "Get notified when you hit a new personal best", value: scoreAlerts, set: setScoreAlerts },
                        ].map((pref) => (
                            <div key={pref.label} className="flex items-center justify-between rounded-lg px-1 py-1">
                                <div>
                                    <p className="text-sm font-medium text-zinc-900">{pref.label}</p>
                                    <p className="text-xs text-zinc-400">{pref.desc}</p>
                                </div>
                                <button onClick={() => pref.set(!pref.value)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${pref.value ? "bg-zinc-900" : "bg-zinc-200"}`}>
                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${pref.value ? "translate-x-5" : "translate-x-0"}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Danger Zone ── */}
                <div className="rounded-2xl border border-red-200 bg-red-50/30 p-6">
                    <h2 className="mb-2 text-lg font-semibold text-red-900">Danger Zone</h2>
                    <p className="mb-4 text-sm text-red-700/70">Once you delete your account, there is no going back. Please be certain.</p>
                    <button onClick={() => setDeleteOpen(true)}
                        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50">
                        Delete Account
                    </button>
                </div>

                {/* Delete Confirmation Modal */}
                {deleteOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={() => setDeleteOpen(false)} />
                        <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl" style={{ animation: "fadeSlideIn 0.15s ease-out" }}>
                            <h3 className="text-lg font-semibold text-zinc-900">Delete Account</h3>
                            <p className="mt-2 text-sm text-zinc-500">This action is <strong>permanent</strong> and cannot be undone. All your data, interviews, and settings will be deleted.</p>
                            <div className="mt-4">
                                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Type <strong>DELETE</strong> to confirm</label>
                                <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
                                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }}
                                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Cancel</button>
                                <button onClick={handleDeleteAccount} disabled={deleteConfirm !== "DELETE"}
                                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
