export function isAccountLocked(lockedUntil: Date | null | undefined, now = new Date()): boolean {
  return !!lockedUntil && lockedUntil > now;
}

export const ACCOUNT_LOCKED_MESSAGE =
  "This account is temporarily locked. Please try again later or contact support.";
