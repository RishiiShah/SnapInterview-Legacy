import { NextResponse } from "next/server";

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

function getTrustedOriginSuffixes(): string[] {
  const raw = process.env.CSRF_TRUSTED_ORIGIN_SUFFIXES;
  if (!raw) return [];

  return raw
    .split(",")
    .map((suffix) => suffix.trim().toLowerCase())
    .filter(Boolean)
    .map((suffix) => (suffix.startsWith(".") ? suffix : `.${suffix}`));
}

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  const configuredOrigins = [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
  ];

  for (const origin of configuredOrigins) {
    const normalized = normalizeOrigin(origin);
    if (normalized) {
      origins.add(normalized);
    }
  }

  const extraTrustedOrigins = process.env.CSRF_TRUSTED_ORIGINS;
  if (extraTrustedOrigins) {
    for (const origin of extraTrustedOrigins.split(",")) {
      const normalized = normalizeOrigin(origin.trim());
      if (normalized) {
        origins.add(normalized);
      }
    }
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return origins;
}

function originMatchesTrustedSuffix(origin: string): boolean {
  const suffixes = getTrustedOriginSuffixes();
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
