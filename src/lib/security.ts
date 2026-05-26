import crypto from "crypto";
import { env } from "@/lib/env";

type HeaderSource = Headers | Record<string, string | string[] | undefined>;

const SECURITY_SECRET = env.AUTH_SECRET;

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
  let ip = forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || null;

  if (ip) {
    // Normalize IPv4-mapped IPv6 addresses
    if (ip.startsWith("::ffff:")) {
      ip = ip.replace("::ffff:", "");
    }

    // Apply /64 subnet grouping to pure IPv6 addresses
    if (ip.includes(":") && !ip.includes(".")) {
      const parts = ip.split(":");
      if (parts.length > 4) {
        ip = parts.slice(0, 4).join(":") + "::/64";
      }
    }
  }

  return {
    ipHash: ip ? keyedHash(`ip:${ip}`) : null,
    userAgent: userAgentValue ? userAgentValue.slice(0, 300) : null,
  };
}

// describeUserAgent moved to @/lib/describe-user-agent (client-safe); do not re-export here to avoid pulling server code into client bundle.