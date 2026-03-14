/**
 * Client-safe utility to describe a user agent string.
 * Do not import server-only modules here; this file may be used by "use client" components.
 */
export function describeUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) {
    return "Unknown device";
  }

  const source = userAgent.toLowerCase();

  const browser = source.includes("edg/")
    ? "Edge"
    : source.includes("chrome/")
      ? "Chrome"
      : source.includes("safari/") && !source.includes("chrome/")
        ? "Safari"
        : source.includes("firefox/")
          ? "Firefox"
          : "Browser";

  const operatingSystem = source.includes("mac os x")
    ? "macOS"
    : source.includes("windows")
      ? "Windows"
      : source.includes("iphone") || source.includes("ipad")
        ? "iOS"
        : source.includes("android")
          ? "Android"
          : "Unknown OS";

  return `${browser} on ${operatingSystem}`;
}
