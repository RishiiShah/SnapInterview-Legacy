import { NextResponse } from "next/server";
import { logger } from "@/utils/logger";

// Public, unauthenticated endpoint: browsers POST CSP violation reports here without
// credentials, so no auth/CSRF applies. It only logs (never writes to the DB) and is
// guarded by a body-size cap and field truncation to avoid log-flooding abuse.
const MAX_BODY_BYTES = 16 * 1024;
const MAX_FIELD_LENGTH = 500;

function field(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return value.slice(0, MAX_FIELD_LENGTH);
}

function logViolation(report: Record<string, unknown> | null | undefined) {
  if (!report) return;
  logger.warn("CSP violation (report-only)", {
    directive:
      field(report["effective-directive"]) ??
      field(report["effectiveDirective"]) ??
      field(report["violated-directive"]) ??
      field(report["violatedDirective"]),
    blockedUri: field(report["blocked-uri"]) ?? field(report["blockedURL"]),
    documentUri: field(report["document-uri"]) ?? field(report["documentURL"]),
    sample: field(report["script-sample"]) ?? field(report["sample"]),
  });
}

export async function POST(req: Request) {
  // 204 on every path: the browser ignores the body and we never want to surface errors.
  const noContent = new NextResponse(null, { status: 204 });

  try {
    const raw = await req.text();
    if (!raw || raw.length > MAX_BODY_BYTES) return noContent;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return noContent;
    }

    if (Array.isArray(parsed)) {
      // Reporting API format: [{ type: "csp-violation", body: {...} }, ...]
      for (const entry of parsed) {
        if (entry && typeof entry === "object" && (entry as { type?: string }).type === "csp-violation") {
          logViolation((entry as { body?: Record<string, unknown> }).body);
        }
      }
    } else if (parsed && typeof parsed === "object") {
      // Legacy report-uri format: { "csp-report": {...} }
      logViolation((parsed as { "csp-report"?: Record<string, unknown> })["csp-report"]);
    }
  } catch {
    // Swallow — reporting must never error.
  }

  return noContent;
}
