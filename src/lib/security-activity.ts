const FAILED_LOGIN_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_GROUPED_FAILED_ATTEMPTS = 2;
const MAX_LOGIN_SUCCESSES = 10;

export const UNKNOWN_DEVICE_KEY = "__unknown__";

export function deviceKeyFromUserAgent(userAgent: string | null | undefined): string {
  return userAgent?.trim() || UNKNOWN_DEVICE_KEY;
}

export function userAgentFromDeviceKey(deviceKey: string): string | null {
  return deviceKey === UNKNOWN_DEVICE_KEY ? null : deviceKey;
}

type SessionLike = {
  id: string;
  userAgent: string | null;
  updatedAt: Date;
  expiresAt: Date;
};

export type GroupedDeviceSession = {
  deviceKey: string;
  userAgent: string | null;
  sessionIds: string[];
  current: boolean;
  lastSeenAt: Date;
  expiresAt: Date;
};

export function groupActiveSessionsByDevice(
  sessions: SessionLike[],
  currentSessionId: string | undefined,
): GroupedDeviceSession[] {
  const grouped = new Map<string, GroupedDeviceSession>();

  for (const session of sessions) {
    const deviceKey = deviceKeyFromUserAgent(session.userAgent);
    const existing = grouped.get(deviceKey);

    if (!existing) {
      grouped.set(deviceKey, {
        deviceKey,
        userAgent: session.userAgent,
        sessionIds: [session.id],
        current: session.id === currentSessionId,
        lastSeenAt: session.updatedAt,
        expiresAt: session.expiresAt,
      });
      continue;
    }

    existing.sessionIds.push(session.id);
    if (session.id === currentSessionId) {
      existing.current = true;
    }
    if (session.updatedAt > existing.lastSeenAt) {
      existing.lastSeenAt = session.updatedAt;
    }
    if (session.expiresAt > existing.expiresAt) {
      existing.expiresAt = session.expiresAt;
    }
  }

  return [...grouped.values()].sort(
    (a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime(),
  );
}

type SecurityEventLike = {
  id: string;
  type: string;
  createdAt: Date;
  userAgent: string | null;
  metadata: unknown;
};

export type LoginSuccessActivity = {
  id: string;
  createdAt: Date;
  userAgent: string | null;
  provider: string | null;
};

export type GroupedFailedLoginActivity = {
  deviceKey: string;
  userAgent: string | null;
  attemptCount: number;
  lastAttemptAt: Date;
};

function parseEventMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

function isInvalidCredentialsFailure(metadata: unknown): boolean {
  const parsed = parseEventMetadata(metadata);
  return parsed?.reason === "invalid_credentials";
}

export function buildUserSecurityActivity(events: SecurityEventLike[], now = new Date()) {
  const since = now.getTime() - FAILED_LOGIN_LOOKBACK_MS;

  const loginSuccesses: LoginSuccessActivity[] = [];
  const failedByDevice = new Map<string, GroupedFailedLoginActivity>();

  for (const event of events) {
    if (event.type === "LOGIN_SUCCESS") {
      if (loginSuccesses.length < MAX_LOGIN_SUCCESSES) {
        const metadata = parseEventMetadata(event.metadata);
        loginSuccesses.push({
          id: event.id,
          createdAt: event.createdAt,
          userAgent: event.userAgent,
          provider: typeof metadata?.provider === "string" ? metadata.provider : null,
        });
      }
      continue;
    }

    if (event.type !== "LOGIN_FAILED") {
      continue;
    }

    if (event.createdAt.getTime() < since) {
      continue;
    }

    if (!isInvalidCredentialsFailure(event.metadata)) {
      continue;
    }

    const deviceKey = deviceKeyFromUserAgent(event.userAgent);
    const existing = failedByDevice.get(deviceKey);

    if (!existing) {
      failedByDevice.set(deviceKey, {
        deviceKey,
        userAgent: event.userAgent,
        attemptCount: 1,
        lastAttemptAt: event.createdAt,
      });
      continue;
    }

    existing.attemptCount += 1;
    if (event.createdAt > existing.lastAttemptAt) {
      existing.lastAttemptAt = event.createdAt;
    }
  }

  const failedLoginAttempts = [...failedByDevice.values()]
    .filter((entry) => entry.attemptCount >= MIN_GROUPED_FAILED_ATTEMPTS)
    .sort((a, b) => b.lastAttemptAt.getTime() - a.lastAttemptAt.getTime());

  return { loginSuccesses, failedLoginAttempts };
}
