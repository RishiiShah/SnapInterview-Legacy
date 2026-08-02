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
  const normalized = provider.toLowerCase();
  if (normalized === "credentials" || normalized === "email") return "Email";
  if (normalized === "google") return "Google";
  if (normalized.length <= 3) return "Email";
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
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        setError(
          typeof payload?.error === "string" ? payload.error : "Failed to load security settings.",
        );
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
    <div className="space-y-12">
      <PasswordTab />

      <section className="border-t border-white/[0.06] pt-10">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl tracking-tight text-[#F2F4F8]">Signed-in devices</h2>
            <p className="mt-1.5 text-sm text-[#A8B0C2]">
              Active login sessions grouped by device. Revoke any device you no longer trust.
            </p>
          </div>
          {otherDevices.length > 0 ? (
            <button
              type="button"
              onClick={() => void runAction({ action: "revokeOthers" })}
              disabled={busyDeviceKey === "others"}
              className="cursor-pointer shrink-0 text-sm text-[#A8B0C2] transition-colors hover:text-[#C5CBD8] disabled:opacity-50"
            >
              {busyDeviceKey === "others" ? "Signing out…" : "Sign out others"}
            </button>
          ) : null}
        </div>

        <div className="divide-y divide-white/[0.06]">
          {loading ? (
            <p className="py-4 text-sm text-[#A8B0C2]">Loading devices…</p>
          ) : data.devices.length === 0 ? (
            <p className="py-4 text-sm text-[#A8B0C2]">No active devices found.</p>
          ) : (
            data.devices.map((device) => (
              <div
                key={device.deviceKey}
                className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#E8ECF4]">
                    {describeUserAgent(device.userAgent)}
                    {device.current ? (
                      <span className="ml-2 text-[11px] font-normal text-emerald-400">Current</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-[#A8B0C2]">
                    Last seen {formatDate(device.lastSeenAt)} · Expires {formatDate(device.expiresAt)}
                    {device.sessionIds.length > 1
                      ? ` · ${device.sessionIds.length} active sessions`
                      : ""}
                  </p>
                </div>
                {!device.current && (
                  <button
                    type="button"
                    onClick={() =>
                      void runAction({ action: "revokeDevice", deviceKey: device.deviceKey })
                    }
                    disabled={busyDeviceKey === device.deviceKey}
                    className="cursor-pointer shrink-0 text-xs text-[#A8B0C2] transition-colors hover:text-[#C5CBD8] disabled:opacity-50"
                  >
                    {busyDeviceKey === device.deviceKey ? "Revoking…" : "Sign out"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="border-t border-white/[0.06] pt-10">
        <h2 className="font-display text-xl tracking-tight text-[#F2F4F8]">Recent sign-ins</h2>
        <p className="mt-1.5 text-sm text-[#A8B0C2]">Successful logins from the last 30 days.</p>

        <div className="mt-5 divide-y divide-white/[0.06]">
          {loading ? (
            <p className="py-4 text-sm text-[#A8B0C2]">Loading sign-ins…</p>
          ) : data.loginSuccesses.length === 0 ? (
            <p className="py-4 text-sm text-[#A8B0C2]">No recent sign-ins recorded.</p>
          ) : (
            data.loginSuccesses.map((entry) => (
              <div key={entry.id} className="py-4 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-[#E8ECF4]">Signed in</p>
                <p className="mt-1 text-xs text-[#A8B0C2]">
                  {formatDate(entry.createdAt)} · {describeUserAgent(entry.userAgent)} ·{" "}
                  {formatProvider(entry.provider)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="border-t border-white/[0.06] pt-10">
        <h2 className="font-display text-xl tracking-tight text-[#F2F4F8]">
          Suspicious sign-in attempts
        </h2>
        <p className="mt-1.5 text-sm text-[#A8B0C2]">
          Multiple wrong-password attempts from the same device in the last 30 days.
        </p>

        <div className="mt-5 divide-y divide-white/[0.06]">
          {loading ? (
            <p className="py-4 text-sm text-[#A8B0C2]">Loading attempts…</p>
          ) : data.failedLoginAttempts.length === 0 ? (
            <p className="py-4 text-sm text-[#A8B0C2]">No repeated failed attempts detected.</p>
          ) : (
            data.failedLoginAttempts.map((entry) => (
              <div key={entry.deviceKey} className="py-4 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-[#E8ECF4]">
                  {entry.attemptCount} failed attempts
                </p>
                <p className="mt-1 text-xs text-[#A8B0C2]">
                  Last attempt {formatDate(entry.lastAttemptAt)} ·{" "}
                  {describeUserAgent(entry.userAgent)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      {actionMessage && <p className="text-sm text-emerald-400">{actionMessage}</p>}
    </div>
  );
}
