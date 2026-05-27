"use client";

import { useEffect, useState } from "react";
import PasswordTab from "@/components/settings/PasswordTab";
import { describeUserAgent } from "@/lib/describe-user-agent";

type SecuritySession = {
  id: string;
  current: boolean;
  expiresAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
  userAgent: string | null;
};

type SecurityEvent = {
  id: string;
  type: string;
  createdAt: string;
  userAgent: string | null;
};

type SecurityResponse = {
  sessions: SecuritySession[];
  events: SecurityEvent[];
};

function formatEventLabel(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SecurityTab() {
  const [data, setData] = useState<SecurityResponse>({ sessions: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);

  const loadSecurityData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/security", { method: "GET" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(typeof payload?.error === "string" ? payload.error : "Failed to load security settings.");
        return;
      }

      setData(payload as SecurityResponse);
    } catch {
      setError("Failed to load security settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSecurityData();
  }, []);

  async function runAction(body: { action: "revoke"; sessionId: string } | { action: "revokeOthers" }) {
    setActionMessage(null);
    setBusySessionId(body.action === "revoke" ? body.sessionId : "others");

    try {
      const response = await fetch("/api/settings/security", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(typeof payload?.error === "string" ? payload.error : "Security action failed.");
        return;
      }

      setActionMessage(
        body.action === "revokeOthers" ? "Signed out other active sessions." : "Session revoked."
      );
      await loadSecurityData();
    } catch {
      setError("Security action failed.");
    } finally {
      setBusySessionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PasswordTab />

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex flex-col items-start justify-between gap-3 border-b border-zinc-100 px-4 py-5 sm:flex-row sm:items-center sm:px-6 lg:px-8 lg:py-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Active Sessions</h2>
            <p className="mt-1 text-sm text-zinc-500">See where you are signed in and revoke devices you no longer trust.</p>
          </div>
          <button
            onClick={() => void runAction({ action: "revokeOthers" })}
            disabled={busySessionId === "others"}
            className="w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {busySessionId === "others" ? "Signing out…" : "Sign out other devices"}
          </button>
        </div>

        <div className="divide-y divide-zinc-100">
          {loading ? (
            <p className="px-4 py-5 text-sm text-zinc-500 sm:px-6 lg:px-8 lg:py-6">Loading sessions…</p>
          ) : data.sessions.length === 0 ? (
            <p className="px-4 py-5 text-sm text-zinc-500 sm:px-6 lg:px-8 lg:py-6">No active sessions found.</p>
          ) : (
            data.sessions.map((session) => (
              <div key={session.id} className="flex flex-col items-start justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {describeUserAgent(session.userAgent)}
                    {session.current && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Current</span>}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Last seen {formatDate(session.lastSeenAt)} • Expires {formatDate(session.expiresAt)}
                  </p>
                </div>
                {!session.current && (
                  <button
                    onClick={() => void runAction({ action: "revoke", sessionId: session.id })}
                    disabled={busySessionId === session.id}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {busySessionId === session.id ? "Revoking…" : "Revoke"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <h2 className="text-lg font-semibold text-zinc-900">Recent Security Activity</h2>
          <p className="mt-1 text-sm text-zinc-500">Keep an eye on sign-ins, password changes, and revoked sessions.</p>
        </div>

        <div className="divide-y divide-zinc-100">
          {loading ? (
            <p className="px-4 py-5 text-sm text-zinc-500 sm:px-6 lg:px-8 lg:py-6">Loading activity…</p>
          ) : data.events.length === 0 ? (
            <p className="px-4 py-5 text-sm text-zinc-500 sm:px-6 lg:px-8 lg:py-6">No recent security events.</p>
          ) : (
            data.events.map((event) => (
              <div key={event.id} className="px-4 py-4 sm:px-6 lg:px-8">
                <p className="text-sm font-medium text-zinc-900">{formatEventLabel(event.type)}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDate(event.createdAt)} • {describeUserAgent(event.userAgent)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {actionMessage && <p className="text-sm text-emerald-600">{actionMessage}</p>}
    </div>
  );
}