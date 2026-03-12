import crypto from "crypto";

type HeaderSource = Headers | Record<string, string | string[] | undefined>;

const SECURITY_SECRET = process.env.AUTH_SECRET;

if (!SECURITY_SECRET) {
  throw new Error("Missing AUTH_SECRET environment variable");
}

function getHeaderValue(source: HeaderSource | null | undefined, name: string): string | null {
  if (!source) {
    return null;
  }

  if (source instanceof Headers) {
    return source.get(name);
  }

  const value = source[name.toLowerCase()] ?? source[name];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function keyedHash(value: string) {
  return crypto.createHmac("sha256", SECURITY_SECRET as string).update(value).digest("hex");
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateNumericCode(length = 6) {
  const max = 10 ** length;
  const min = 10 ** (length - 1);
  return crypto.randomInt(min, max).toString();
}

export function hashOneTimeCode(code: string) {
  return keyedHash(`otp:${code}`);
}

export function verifyOneTimeCode(code: string, codeHash: string) {
  return constantTimeEqual(hashOneTimeCode(code), codeHash);
}

export function extractRequestContext(source: HeaderSource | null | undefined) {
  const forwardedFor = getHeaderValue(source, "x-forwarded-for");
  const realIp = getHeaderValue(source, "x-real-ip");
  const userAgentValue = getHeaderValue(source, "user-agent")?.trim() || null;
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || null;

  return {
    ipHash: ip ? keyedHash(`ip:${ip}`) : null,
    userAgent: userAgentValue ? userAgentValue.slice(0, 300) : null,
  };
}

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