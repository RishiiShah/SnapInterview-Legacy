import { NextResponse } from "next/server";
import { env } from "@/lib/env";

type OriginValidationResult = {
  isValid: boolean;
  normalizedOrigin: string | null;
};

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

// Module-level cache — built once on first request, reused for the lifetime of
// the module (i.e. the warm serverless instance). Both are null until first use.
let _allowedOrigins: Set<string> | null = null;
let _trustedSuffixes: string[] | null = null;

const SHARED_HOSTING_SUFFIXES = new Set([
  ".vercel.app",
  ".netlify.app",
  ".pages.dev",
  ".github.io",
  ".herokuapp.com",
  ".fly.dev",
  ".render.com",
]);

// Reset the cache. Only exported for use in tests — do not call in production code.
export function _resetOriginCacheForTesting() {
  _allowedOrigins = null;
  _trustedSuffixes = null;
}

function getAllowedOrigins(): Set<string> {
  if (_allowedOrigins !== null) return _allowedOrigins;

  const origins = new Set<string>();

  for (const raw of [env.BETTER_AUTH_URL, env.NEXT_PUBLIC_APP_URL, env.APP_URL]) {
    const normalized = normalizeOrigin(raw);
    if (normalized) origins.add(normalized);
  }

  if (env.CSRF_TRUSTED_ORIGINS) {
    for (const raw of env.CSRF_TRUSTED_ORIGINS.split(",")) {
      const normalized = normalizeOrigin(raw.trim());
      if (normalized) origins.add(normalized);
    }
  }

  if (env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  // Automatically trust the current Vercel deployment URLs (enables secure Preview Deployments)
  if (process.env.VERCEL_URL) {
    const normalized = normalizeOrigin(`https://${process.env.VERCEL_URL}`);
    if (normalized) origins.add(normalized);
  }
  if (process.env.VERCEL_BRANCH_URL) {
    const normalized = normalizeOrigin(`https://${process.env.VERCEL_BRANCH_URL}`);
    if (normalized) origins.add(normalized);
  }

  _allowedOrigins = origins;
  return _allowedOrigins;
}

function getTrustedSuffixes(): string[] {
  if (_trustedSuffixes !== null) return _trustedSuffixes;

  if (!env.CSRF_TRUSTED_ORIGIN_SUFFIXES) {
    _trustedSuffixes = [];
    return _trustedSuffixes;
  }

  _trustedSuffixes = env.CSRF_TRUSTED_ORIGIN_SUFFIXES
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => (s.startsWith(".") ? s : `.${s}`))
    .filter((suffix) => !SHARED_HOSTING_SUFFIXES.has(suffix));

  return _trustedSuffixes;
}

function originMatchesTrustedSuffix(origin: string): boolean {
  const suffixes = getTrustedSuffixes();
  if (suffixes.length === 0) return false;

  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return suffixes.some((suffix) => hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

export function validateRequestOrigin(req: Request): OriginValidationResult {
  const normalizedOrigin = normalizeOrigin(req.headers.get("origin"));
  if (!normalizedOrigin) {
    return { isValid: false, normalizedOrigin: null };
  }

  const allowedOrigins = getAllowedOrigins();
  const isValid =
    allowedOrigins.has(normalizedOrigin) || originMatchesTrustedSuffix(normalizedOrigin);

  return { isValid, normalizedOrigin };
}

export function csrfRejectIfInvalid(req: Request): NextResponse | null {
  const { isValid } = validateRequestOrigin(req);
  if (!isValid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
