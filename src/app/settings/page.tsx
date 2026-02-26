"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getInitials } from "@/utils/helpers";
import { FadeIn, SlideIn } from "@/components/ui/motion";

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

    // Active settings tab
    const [activeTab, setActiveTab] = useState<"profile" | "password" | "notifications" | "danger">("profile");

    // Password strength
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

    async function handleSaveProfile() {
        setProfileSaving(true);
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
            setDeleteOpen(false);
            setDeleteConfirm("");
        }
    }

    const tabs = [
        {
            id: "profile" as const, label: "Profile",
            desc: "Personal information",
            icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
        },
        {
            id: "password" as const, label: "Password",
            desc: "Security settings",
            icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>,
        },
        {
            id: "notifications" as const, label: "Notifications",
            desc: "Email & alerts",
            icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>,
        },
        {
            id: "danger" as const, label: "Danger Zone",
            desc: "Delete account",
            icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
        },
    ];

    const EyeToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
        <button type="button" onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
            aria-label={show ? "Hide password" : "Show password"}>
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

    return (
        <DashboardShell>
            <div className="space-y-5 pb-8">
                <SlideIn>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Settings</h1>
                        <p className="mt-1 text-sm text-zinc-500">Manage your account and preferences.</p>
                    </div>
                </SlideIn>

                {/* Two-column layout: Left nav + Right content */}
                <FadeIn delay={0.1} direction="up">
                    <div className="flex gap-6">
                        {/* Sidebar nav */}
                        <nav className="w-56 shrink-0">
                            <div className="sticky top-6 space-y-1 rounded-2xl border border-zinc-200 bg-white p-2">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${activeTab === tab.id
                                            ? "bg-zinc-900 text-white shadow-sm"
                                            : tab.id === "danger"
                                                ? "text-red-600 hover:bg-red-50"
                                                : "text-zinc-600 hover:bg-zinc-50"
                                            }`}
                                    >
                                        <span className={`shrink-0 ${activeTab === tab.id ? "text-white" : tab.id === "danger" ? "text-red-400" : "text-zinc-400"}`}>
                                            {tab.icon}
                                        </span>
                                        <div>
                                            <p className="text-sm font-medium leading-tight">{tab.label}</p>
                                            <p className={`text-[11px] leading-tight ${activeTab === tab.id ? "text-white/60" : tab.id === "danger" ? "text-red-400" : "text-zinc-400"
                                                }`}>{tab.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </nav>

                        {/* Content area */}
                        <div className="flex-1 rounded-2xl border border-zinc-200 bg-white">
                            {/* ── Profile ── */}
                            {activeTab === "profile" && (
                                <div>
                                    {/* Header */}
                                    <div className="border-b border-zinc-100 px-8 py-6">
                                        <h2 className="text-lg font-semibold text-zinc-900">Profile</h2>
                                        <p className="mt-1 text-sm text-zinc-500">Update your personal information and how others see you.</p>
                                    </div>

                                    {/* Avatar section */}
                                    <div className="border-b border-zinc-100 px-8 py-6">
                                        <div className="flex items-center gap-5">
                                            <div className="relative group">
                                                {userImage ? (
                                                    <Image src={userImage} alt={userName} width={72} height={72} className="h-[72px] w-[72px] rounded-full object-cover ring-4 ring-zinc-100" />
                                                ) : (
                                                    <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-zinc-900 text-xl font-bold text-white ring-4 ring-zinc-100">{initials}</div>
                                                )}
                                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-zinc-900/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-base font-semibold text-zinc-900">{userName}</p>
                                                <p className="text-sm text-zinc-400">{userEmail}</p>
                                                <p className="mt-1.5 text-xs text-zinc-400">Click avatar to upload a new photo</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Form fields */}
                                    <div className="px-8 py-6 space-y-5">
                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Display Name</label>
                                                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                                                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100" />
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Email</label>
                                                <input type="email" value={userEmail} disabled
                                                    className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm text-zinc-500 cursor-not-allowed" />
                                                <p className="mt-1 text-xs text-zinc-400">Email cannot be changed.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center gap-3 border-t border-zinc-100 px-8 py-5">
                                        <button onClick={handleSaveProfile} disabled={profileSaving}
                                            className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-700 disabled:opacity-50">
                                            {profileSaving ? "Saving…" : "Save Changes"}
                                        </button>
                                        {profileSaved && (
                                            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                                Saved successfully
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Password ── */}
                            {activeTab === "password" && (
                                <div>
                                    {/* Header */}
                                    <div className="border-b border-zinc-100 px-8 py-6">
                                        <h2 className="text-lg font-semibold text-zinc-900">Change Password</h2>
                                        <p className="mt-1 text-sm text-zinc-500">Update your password to keep your account secure.</p>
                                    </div>

                                    {/* Fields */}
                                    <div className="px-8 py-6 space-y-5">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Current Password</label>
                                            <div className="relative">
                                                <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                                                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-11 text-sm text-zinc-900 outline-none transition-all focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100" />
                                                <EyeToggle show={showCurrentPassword} onToggle={() => setShowCurrentPassword(!showCurrentPassword)} />
                                            </div>
                                        </div>

                                        <div className="h-px bg-zinc-100" />

                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-zinc-700">New Password</label>
                                            <div className="relative">
                                                <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-11 text-sm text-zinc-900 outline-none transition-all focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100" />
                                                <EyeToggle show={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)} />
                                            </div>
                                            {/* Strength meter */}
                                            {newPassword && (
                                                <div className="mt-2.5 space-y-1.5">
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4].map((i) => (
                                                            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength.score ? passwordStrength.color : "bg-zinc-100"
                                                                }`} />
                                                        ))}
                                                    </div>
                                                    <p className="text-[11px] text-zinc-400">{passwordStrength.label}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Confirm New Password</label>
                                            <div className="relative">
                                                <input type={showConfirmNewPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-11 text-sm text-zinc-900 outline-none transition-all focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100" />
                                                <EyeToggle show={showConfirmNewPassword} onToggle={() => setShowConfirmNewPassword(!showConfirmNewPassword)} />
                                            </div>
                                            {/* Match indicator */}
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

                                        {/* Requirements hint */}
                                        <div className="rounded-xl bg-zinc-50 p-4">
                                            <p className="text-xs font-medium text-zinc-500 mb-2">Password requirements:</p>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {[
                                                    { rule: "At least 8 characters", met: newPassword.length >= 8 },
                                                    { rule: "One uppercase letter", met: /[A-Z]/.test(newPassword) },
                                                    { rule: "One number", met: /[0-9]/.test(newPassword) },
                                                    { rule: "One special character", met: /[^A-Za-z0-9]/.test(newPassword) },
                                                ].map((req) => (
                                                    <p key={req.rule} className={`text-[11px] flex items-center gap-1.5 ${!newPassword ? "text-zinc-400" : req.met ? "text-emerald-600" : "text-zinc-400"
                                                        }`}>
                                                        <span className={`inline-block h-1 w-1 rounded-full ${!newPassword ? "bg-zinc-300" : req.met ? "bg-emerald-500" : "bg-zinc-300"
                                                            }`} />
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

                                    {/* Footer */}
                                    <div className="flex items-center gap-3 border-t border-zinc-100 px-8 py-5">
                                        <button onClick={handleChangePassword} disabled={passwordSaving || !currentPassword || !newPassword}
                                            className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                            {passwordSaving ? "Updating…" : "Update Password"}
                                        </button>
                                        {passwordSaved && (
                                            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                                Password updated
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Notifications ── */}
                            {activeTab === "notifications" && (
                                <div>
                                    {/* Header */}
                                    <div className="border-b border-zinc-100 px-8 py-6">
                                        <h2 className="text-lg font-semibold text-zinc-900">Notification Preferences</h2>
                                        <p className="mt-1 text-sm text-zinc-500">Choose what notifications you want to receive.</p>
                                    </div>

                                    <div className="px-8 py-6">
                                        <div className="space-y-2">
                                            {[
                                                { label: "Email notifications", desc: "Receive updates about your account via email", value: emailNotifs, set: setEmailNotifs, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg> },
                                                { label: "Practice reminders", desc: "Get daily reminders to keep practicing", value: practiceReminders, set: setPracticeReminders, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                                                { label: "Weekly report", desc: "Receive a weekly summary of your progress", value: weeklyReport, set: setWeeklyReport, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg> },
                                                { label: "Score alerts", desc: "Get notified when you hit a new personal best", value: scoreAlerts, set: setScoreAlerts, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228M18.75 4.236V2.721" /></svg> },
                                            ].map((pref) => (
                                                <div key={pref.label} className="flex items-center justify-between rounded-xl border border-zinc-100 px-5 py-4 transition-all hover:border-zinc-200 hover:shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <span className={`shrink-0 ${pref.value ? "text-zinc-700" : "text-zinc-300"} transition-colors`}>
                                                            {pref.icon}
                                                        </span>
                                                        <div>
                                                            <p className="text-sm font-medium text-zinc-900">{pref.label}</p>
                                                            <p className="text-xs text-zinc-400">{pref.desc}</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => pref.set(!pref.value)}
                                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${pref.value ? "bg-zinc-900" : "bg-zinc-200"}`}>
                                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${pref.value ? "translate-x-5" : "translate-x-0"}`} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Danger Zone ── */}
                            {activeTab === "danger" && (
                                <div>
                                    {/* Header */}
                                    <div className="border-b border-red-100 px-8 py-6">
                                        <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
                                        <p className="mt-1 text-sm text-red-700/70">Irreversible and destructive actions. Proceed with caution.</p>
                                    </div>

                                    <div className="px-8 py-6">
                                        <div className="rounded-xl border border-red-200 bg-red-50/40 p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-100">
                                                    <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-semibold text-red-900">Delete Account</h3>
                                                    <p className="mt-1 text-sm text-red-700/70">Once you delete your account, there is no going back. All your data, interviews, recordings, and settings will be permanently removed.</p>
                                                    <button onClick={() => setDeleteOpen(true)}
                                                        className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50">
                                                        Delete Account
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </FadeIn>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={() => setDeleteOpen(false)} />
                    <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl" style={{ animation: "fadeSlideIn 0.15s ease-out" }}>
                        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>
                        <h3 className="text-center text-lg font-semibold text-zinc-900">Delete Account</h3>
                        <p className="mt-2 text-center text-sm text-zinc-500">This action is <strong>permanent</strong> and cannot be undone. All your data will be deleted.</p>
                        <div className="mt-5">
                            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Type <strong>DELETE</strong> to confirm</label>
                            <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
                                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }}
                                className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">Cancel</button>
                            <button onClick={handleDeleteAccount} disabled={deleteConfirm !== "DELETE"}
                                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardShell>
    );
}
