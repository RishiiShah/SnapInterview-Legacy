"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/ui/AppLogo";
import { useSession, signOut } from "@/lib/auth-client";
import {
  IconMessage,
  IconCode,
  IconShield,
  IconCheckCircle,
  IconLockClosed,
  IconArrowRight,
  IconUser,
  IconXMark,
  IconUploadArrow,
  IconChevronDown,
  IconLogout,
} from "@/components/ui/icons";
import LandingFooter from "@/components/landing/LandingFooter";

const HELP_CATEGORIES = [
  {
    title: "AI Interview Practice",
    desc: "Microphone setup, voice recognition, role targeting, and evaluation feedback.",
    icon: IconMessage,
    href: "/faq?category=interviews",
  },
  {
    title: "Coding Workspace",
    desc: "Supported languages, test cases, code execution limits, and IDE features.",
    icon: IconCode,
    href: "/faq?category=coding",
  },
  {
    title: "Account & Security",
    desc: "Password reset, OTP verification, profile data, and privacy settings.",
    icon: IconShield,
    href: "/faq?category=security",
  },
];

export default function HelpSupportPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<string>("technical");
  const [priority, setPriority] = useState<string>("normal");
  const [subject, setSubject] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  
  // Image Attachment state
  const [attachment, setAttachment] = useState<{
    name: string;
    size: string;
    base64: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLoggedIn = Boolean(session?.user);

  const handleSwitchAccount = async () => {
    try {
      await signOut();
    } catch {
      // Ignore signout errors and redirect
    }
    router.replace("/login?callbackUrl=/support");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image file size must be under 5MB");
      return;
    }

    setErrorMessage(null);
    const sizeStr = (file.size / 1024).toFixed(1) + " KB";
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAttachment({
        name: file.name,
        size: sizeStr,
        base64,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          priority,
          subject: subject.trim(),
          description: description.trim(),
          attachmentName: attachment?.name,
          attachmentBase64: attachment?.base64,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit ticket");
      }

      setSubmittedTicketId(data.ticketId);
      setSubject("");
      setDescription("");
      setAttachment(null);
    } catch (err: unknown) {
      const errorStr = err instanceof Error ? err.message : "An unexpected error occurred";
      setErrorMessage(errorStr);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F5F7FF] flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#090A0F]/80 px-4 backdrop-blur-md sm:px-8 lg:px-12">
        <Link
          href={isLoggedIn ? "/dashboard" : "/"}
          prefetch={false}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <AppLogo size={28} className="rounded-md" priority />
          <span className="text-sm font-semibold tracking-tight text-white">
            Snap<span className="text-blue-400">Interview</span>
          </span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/faq"
            prefetch={false}
            className="text-xs font-medium text-[#CBD5E1] transition-colors hover:text-white"
          >
            FAQ
          </Link>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              prefetch={false}
              className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-blue-500"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login?callbackUrl=/support"
                prefetch={false}
                className="text-xs font-medium text-[#CBD5E1] transition-colors hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                prefetch={false}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-blue-500"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Main Content Area - Full max-w-7xl Desktop Width */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12 sm:px-6 lg:px-8 space-y-10">
        {/* Title Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
            Help & Support
          </h1>
          <p className="text-sm text-[#CBD5E1] max-w-xl mx-auto leading-relaxed">
            Browse topic guides or submit a support ticket directly to our engineering team.
          </p>
        </div>

        {/* 3 Topic Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HELP_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.title}
                href={cat.href}
                prefetch={false}
                className="group rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.03]"
              >
                <div className="flex items-center justify-between">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-500/10 text-blue-400">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <IconArrowRight className="h-4 w-4 text-[#94A3B8] group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="mt-3.5 text-sm font-semibold text-white">{cat.title}</h3>
                <p className="mt-1 text-xs text-[#CBD5E1] leading-relaxed">{cat.desc}</p>
              </Link>
            );
          })}
        </div>

        {/* Support Ticket Section - 2-Column Split across max-w-7xl Desktop */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Info Panel (4 cols) */}
            <div className="lg:col-span-4 space-y-5 lg:border-r lg:border-white/[0.08] lg:pr-8">
              <div>
                <h2 className="text-base font-semibold text-white">Submit a Support Ticket</h2>
                <p className="text-xs text-[#CBD5E1] mt-1 leading-relaxed">
                  Have a question, bug report, or feature request? Fill out the ticket form and our support team will follow up via email.
                </p>
              </div>

              <div className="space-y-3.5 pt-1">
                <div className="flex items-start gap-3">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
                    <IconCheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">24 Hour SLA Response</h4>
                    <p className="text-[11px] text-[#CBD5E1] mt-0.5">All tickets are reviewed and answered within 24 hours.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-purple-500/10 text-purple-400 mt-0.5">
                    <IconShield className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Direct Engineering Care</h4>
                    <p className="text-[11px] text-[#CBD5E1] mt-0.5">Technical inquiries are reviewed directly by staff engineers.</p>
                  </div>
                </div>
              </div>

              {/* Signed In Account Box with Switch Account / Logout */}
              {isLoggedIn ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconUser className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">Signed In Account</p>
                      <p className="text-xs font-medium text-white truncate">{session?.user?.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="inline-flex items-center gap-1 shrink-0 rounded bg-emerald-500/20 px-2 py-1 text-[11px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30 hover:text-white cursor-pointer"
                    title="Switch account or log out"
                  >
                    <IconLogout className="h-3 w-3" />
                    <span>Switch</span>
                  </button>
                </div>
              ) : null}
            </div>

            {/* Right Form Panel (8 cols) */}
            <div className="lg:col-span-8">
              {errorMessage ? (
                <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
                  {errorMessage}
                </div>
              ) : null}

              {/* Success Ticket State */}
              {submittedTicketId ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center space-y-3">
                  <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <IconCheckCircle className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-white">Support Ticket Submitted</h3>
                  <p className="text-xs text-[#CBD5E1] max-w-md mx-auto leading-relaxed">
                    Your ticket reference is <strong className="text-white font-mono">{submittedTicketId}</strong>. We dispatched a notification to our support team and emailed a confirmation to <span className="text-white font-medium">{session?.user?.email}</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmittedTicketId(null)}
                    className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white/[0.08] border border-white/[0.12] px-4 py-2 text-xs font-medium text-white hover:bg-white/[0.14] transition-colors cursor-pointer"
                  >
                    Submit Another Ticket
                  </button>
                </div>
              ) : (
                <div className="relative">
                  {/* Form fields with high-contrast crisp text and placeholders */}
                  <form onSubmit={handleSubmitTicket} className={`space-y-4 ${!isLoggedIn ? "opacity-25 pointer-events-none select-none filter blur-[1px]" : ""}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Issue Category Custom Dropdown */}
                      <div>
                        <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                          Issue Category
                        </label>
                        <div className="relative">
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full appearance-none rounded-xl border border-white/[0.1] bg-[#12141A] pl-3.5 pr-10 py-2.5 text-xs font-medium text-white outline-none focus:border-blue-500/50 cursor-pointer"
                          >
                            <option value="technical">AI Mock Interview / Speech & Voice</option>
                            <option value="coding">Coding Workspace & Execution</option>
                            <option value="account">Account & Security</option>
                            <option value="billing">Subscription & Billing</option>
                            <option value="feedback">Feature Request & Feedback</option>
                          </select>
                          <IconChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8] pointer-events-none" />
                        </div>
                      </div>

                      {/* Priority Level Custom Dropdown */}
                      <div>
                        <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                          Priority Level
                        </label>
                        <div className="relative">
                          <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="w-full appearance-none rounded-xl border border-white/[0.1] bg-[#12141A] pl-3.5 pr-10 py-2.5 text-xs font-medium text-white outline-none focus:border-blue-500/50 cursor-pointer"
                          >
                            <option value="low">Low - General Question</option>
                            <option value="normal">Normal - Standard Issue</option>
                            <option value="high">High - Urgent Issue</option>
                          </select>
                          <IconChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8] pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                        Subject Line
                      </label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Brief summary of your issue..."
                        className="w-full rounded-xl border border-white/[0.1] bg-[#12141A] px-3.5 py-2.5 text-xs text-white placeholder-[#94A3B8] outline-none focus:border-blue-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                        Detailed Message
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Please describe what happened, steps to reproduce, or what you need help with..."
                        className="w-full rounded-xl border border-white/[0.1] bg-[#12141A] px-3.5 py-2.5 text-xs text-white placeholder-[#94A3B8] outline-none focus:border-blue-500/50 resize-none"
                      />
                    </div>

                    {/* Optional Image Attachment Input */}
                    <div>
                      <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                        Attach Screenshot or Image (Optional)
                      </label>
                      {attachment ? (
                        <div className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Image Preview Thumbnail */}
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/[0.1] bg-black/40">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={attachment.base64}
                                alt="Attachment preview"
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-white">{attachment.name}</p>
                              <p className="text-[10px] text-[#CBD5E1]">{attachment.size}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={removeAttachment}
                            className="grid h-7 w-7 place-items-center rounded-lg text-[#CBD5E1] transition-colors hover:bg-rose-500/20 hover:text-rose-300 cursor-pointer"
                            title="Remove image"
                          >
                            <IconXMark className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="support-attachment-input"
                          />
                          <label
                            htmlFor="support-attachment-input"
                            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.15] bg-white/[0.02] px-4 py-3 text-xs text-[#CBD5E1] transition-colors hover:border-white/[0.25] hover:text-white"
                          >
                            <IconUploadArrow className="h-4 w-4 text-blue-400" />
                            <span>Click to upload a screenshot (PNG or JPG up to 5MB)</span>
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                      >
                        {submitting ? "Submitting Ticket..." : "Submit Ticket"}
                      </button>
                    </div>
                  </form>

                  {/* Login Banner Overlay when NOT logged in */}
                  {!isLoggedIn ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl border border-white/[0.12] bg-[#090A0F]/90 p-6 text-center backdrop-blur-md">
                      <div className="grid h-11 w-11 place-items-center rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 mb-3">
                        <IconLockClosed className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-semibold text-white">Login Required to Submit a Ticket</h3>
                      <p className="mt-1 text-xs text-[#CBD5E1] max-w-sm leading-relaxed">
                        You can browse FAQs and documentation freely. To open a support ticket or contact our engineering team, please log in to your account.
                      </p>
                      <Link
                        href="/login?callbackUrl=/support"
                        prefetch={false}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-all hover:bg-blue-500"
                      >
                        <span>Log In to Submit Ticket</span>
                        <IconArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
