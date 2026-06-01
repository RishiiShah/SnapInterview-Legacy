"use client";

import { useEffect, useState } from "react";
import PasswordTab from "@/components/settings/PasswordTab";
import { describeUserAgent } from "@/lib/describe-user-agent";

type SecurityDevice = {
  deviceKey: string;
  userAgent: string | null;
  sessionIds: string[];
  current: boolean;
  lastSeenAt: string;
  expiresAt: string;
};

type LoginSuccessActivity = {
  id: string;
  createdAt: string;
  userAgent: string | null;
  provider: string | null;
};

type FailedLoginActivity = {
  deviceKey: string;
  userAgent: string | null;
  attemptCount: number;
  lastAttemptAt: string;
};

type SecurityResponse = {
  devices: SecurityDevice[];
  loginSuccesses: LoginSuccessActivity[];
  failedLoginAttempts: FailedLoginActivity[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatProvider(provider: string | null) {
  if (!provider) return "Email";
  if (provider === "credentials") return "Email";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export default function SecurityTab() {
  const [data, setData] = useState<SecurityResponse>({
    devices: [],
    loginSuccesses: [],
    failedLoginAttempts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyDeviceKey, setBusyDeviceKey] = useState<string | null>(null);

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

  async function runAction(
    body: { action: "revokeDevice"; deviceKey: string } | { action: "revokeOthers" },
  ) {
    setActionMessage(null);
    setBusyDeviceKey(body.action === "revokeDevice" ? body.deviceKey : "others");

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
        body.action === "revokeOthers" ? "Signed out other devices." : "Device signed out.",
      );
      await loadSecurityData();
    } catch {
      setError("Security action failed.");
    } finally {
      setBusyDeviceKey(null);
    }
  }

  const otherDevices = data.devices.filter((device) => !device.current);

  return (
    <div className="space-y-6">
      <PasswordTab />

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-8 py-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Signed-in devices</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Active login sessions grouped by device. Revoke any device you no longer trust.
            </p>
          </div>
          {otherDevices.length > 0 ? (
            <button
              onClick={() => void runAction({ action: "revokeOthers" })}
              disabled={busyDeviceKey === "others"}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyDeviceKey === "others" ? "Signing out…" : "Sign out other devices"}
            </button>
          ) : null}
        </div>

        <div className="divide-y divide-zinc-100">
          {loading ? (
            <p className="px-8 py-6 text-sm text-zinc-500">Loading devices…</p>
          ) : data.devices.length === 0 ? (
            <p className="px-8 py-6 text-sm text-zinc-500">No active devices found.</p>
          ) : (
            data.devices.map((device) => (
              <div key={device.deviceKey} className="flex items-center justify-between gap-4 px-8 py-4">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {describeUserAgent(device.userAgent)}
                    {device.current && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Last seen {formatDate(device.lastSeenAt)} • Expires {formatDate(device.expiresAt)}
                    {device.sessionIds.length > 1
                      ? ` • ${device.sessionIds.length} active sessions`
                      : ""}
                  </p>
                </div>
                {!device.current && (
                  <button
                    onClick={() => void runAction({ action: "revokeDevice", deviceKey: device.deviceKey })}
                    disabled={busyDeviceKey === device.deviceKey}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyDeviceKey === device.deviceKey ? "Revoking…" : "Sign out device"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-8 py-6">
          <h2 className="text-lg font-semibold text-zinc-900">Recent sign-ins</h2>
          <p className="mt-1 text-sm text-zinc-500">Successful logins from the last 30 days.</p>
        </div>

        <div className="divide-y divide-zinc-100">
          {loading ? (
            <p className="px-8 py-6 text-sm text-zinc-500">Loading sign-ins…</p>
          ) : data.loginSuccesses.length === 0 ? (
            <p className="px-8 py-6 text-sm text-zinc-500">No recent sign-ins recorded.</p>
          ) : (
            data.loginSuccesses.map((entry) => (
              <div key={entry.id} className="px-8 py-4">
                <p className="text-sm font-medium text-zinc-900">Signed in</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDate(entry.createdAt)} • {describeUserAgent(entry.userAgent)} •{" "}
                  {formatProvider(entry.provider)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-8 py-6">
          <h2 className="text-lg font-semibold text-zinc-900">Suspicious sign-in attempts</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Multiple wrong-password attempts from the same device in the last 30 days.
          </p>
        </div>

        <div className="divide-y divide-zinc-100">
          {loading ? (
            <p className="px-8 py-6 text-sm text-zinc-500">Loading attempts…</p>
          ) : data.failedLoginAttempts.length === 0 ? (
            <p className="px-8 py-6 text-sm text-zinc-500">No repeated failed attempts detected.</p>
          ) : (
            data.failedLoginAttempts.map((entry) => (
              <div key={entry.deviceKey} className="px-8 py-4">
                <p className="text-sm font-medium text-zinc-900">
                  {entry.attemptCount} failed attempts
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Last attempt {formatDate(entry.lastAttemptAt)} •{" "}
                  {describeUserAgent(entry.userAgent)}
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
