import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { decodeE2ETestIdentity, E2E_TEST_AUTH_COOKIE, isTestAuthEnabled } from "@/lib/test-auth";
import { logger } from "@/utils/logger";

// Better Auth prefixes secure cookies on HTTPS production origins.
const BETTER_AUTH_COOKIE_NAMES = [
    "__Secure-better-auth.session_token",
    "better-auth.session_token",
    "__Secure-better-auth.session_data",
    "better-auth.session_data",
] as const;
const SESSION_VALIDATION_CACHE_MS = 5 * 60 * 1000;
const MAX_SESSION_VALIDATION_CACHE_ENTRIES = 1000;
const PROTECTED_PATH_PREFIXES = ["/dashboard", "/practice", "/questions", "/analytics", "/recordings", "/settings", "/onboarding", "/interview", "/admin"] as const;
const SERVER_GUARDED_PROTECTED_PATH_PREFIXES = ["/dashboard", "/practice", "/questions", "/analytics", "/recordings", "/settings", "/onboarding", "/interview", "/admin"] as const;

type ProxySessionData = {
    user?: {
        id?: string;
        email?: string | null;
        onboardingCompletedAt?: string | Date | null;
    } | null;
};

type SessionValidationResult =
    | { status: "valid"; session: ProxySessionData }
    | { status: "invalid" }
    | { status: "unavailable" };

const sessionValidationCache = new Map<string, {
    expiresAt: number;
    session: ProxySessionData;
}>();

function getBetterAuthSessionToken(request: NextRequest) {
    for (const cookieName of BETTER_AUTH_COOKIE_NAMES) {
        const value = request.cookies.get(cookieName)?.value;
        if (value) return value;
    }
    return undefined;
}

function deleteBetterAuthSessionCookies(response: NextResponse) {
    for (const cookieName of BETTER_AUTH_COOKIE_NAMES) {
        response.cookies.set(cookieName, "", {
            expires: new Date(0),
            maxAge: 0,
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: cookieName.startsWith("__Secure-"),
        });
    }
}

function createNonce() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes));
}

function createContentSecurityPolicy(nonce: string, isDev: boolean) {
    // style-src is split so injected <style>/stylesheets are forbidden (style-src-elem),
    // while inline style="" attributes from React/Framer Motion still work (style-src-attr).
    // cdn.jsdelivr.net: Monaco Editor loads CSS and source maps from this CDN at runtime.
    // worker-src blob: Monaco and code-runner Web Workers use blob: URLs.
    // style-src-elem: dev uses 'unsafe-inline' because Next.js/React dev overlay injects
    // inline <style> tags without nonces, and 'unsafe-inline' is ignored when a nonce is present.
    return `
        default-src 'self';
        script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://va.vercel-scripts.com ${isDev ? "'unsafe-eval'" : ""};
        style-src 'self' https://cdn.jsdelivr.net;
        style-src-elem 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`} https://cdn.jsdelivr.net;
        style-src-attr 'unsafe-inline';
        img-src 'self' https://*.googleusercontent.com data: blob:;
        font-src 'self' data:;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        worker-src 'self' blob:;
        connect-src 'self' https://accounts.google.com https://www.googleapis.com https://*.amazonaws.com https://cdn.jsdelivr.net;
        media-src 'self' https://*.amazonaws.com data: blob:;
        upgrade-insecure-requests;
    `.replace(/\s{2,}/g, " ").trim();
}

function applySecurityHeaders(response: NextResponse, cspHeader: string) {
    response.headers.set("Content-Security-Policy", cspHeader);
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
}

function isValidSessionData(value: unknown): value is ProxySessionData {
    return (
        typeof value === "object" &&
        value !== null &&
        "user" in value &&
        typeof (value as { user?: unknown }).user === "object" &&
        (value as { user?: unknown }).user !== null
    );
}

function readCachedSession(cacheKey: string, now = Date.now()) {
    const cached = sessionValidationCache.get(cacheKey);
    if (!cached) return null;

    if (cached.expiresAt <= now) {
        sessionValidationCache.delete(cacheKey);
        return null;
    }

    return cached.session;
}

function writeCachedSession(cacheKey: string, session: ProxySessionData, now = Date.now()) {
    if (!sessionValidationCache.has(cacheKey) && sessionValidationCache.size >= MAX_SESSION_VALIDATION_CACHE_ENTRIES) {
        const oldestKey = sessionValidationCache.keys().next().value;
        if (oldestKey) sessionValidationCache.delete(oldestKey);
    }

    sessionValidationCache.set(cacheKey, {
        expiresAt: now + SESSION_VALIDATION_CACHE_MS,
        session,
    });
}

/**
 * Validates the session with the Better Auth server, with a short in-process
 * cache so protected page navigation does not hit auth/DB on every request.
 */
async function getSession(request: NextRequest, cacheKey: string): Promise<SessionValidationResult> {
    const cached = readCachedSession(cacheKey);
    if (cached) {
        return { status: "valid", session: cached };
    }

    try {
        const sessionRes = await fetch(`${env.BETTER_AUTH_URL}/api/auth/get-session`, {
            headers: { cookie: request.headers.get("cookie") || "" },
        });
        if (!sessionRes.ok) {
            if (sessionRes.status !== 401 && sessionRes.status !== 403) {
                logger.warn("Proxy session validation unavailable", {
                    status: sessionRes.status,
                });
                return { status: "unavailable" };
            }

            sessionValidationCache.delete(cacheKey);
            return { status: "invalid" };
        }

        const sessionData = await sessionRes.json();
        if (!isValidSessionData(sessionData)) {
            sessionValidationCache.delete(cacheKey);
            return { status: "invalid" };
        }

        writeCachedSession(cacheKey, sessionData);
        return { status: "valid", session: sessionData };
    } catch (err) {
        logger.warn("Proxy session validation failed", {
            error: err instanceof Error ? err.message : String(err),
        });
        return { status: "unavailable" };
    }
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isDev = env.NODE_ENV !== "production";
    const nonce = createNonce();
    const cspHeader = createContentSecurityPolicy(nonce, isDev);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    // Next.js reads the forwarded CSP request header while rendering to nonce its framework scripts.
    requestHeaders.set("Content-Security-Policy", cspHeader);

    // 1. Auth checks
    const isProtectedPath = PROTECTED_PATH_PREFIXES.some((path) => pathname.startsWith(path));

    const token = getBetterAuthSessionToken(request);
    const testIdentity = isTestAuthEnabled()
        ? await decodeE2ETestIdentity(request.cookies.get(E2E_TEST_AUTH_COOKIE)?.value)
        : null;

    if (isProtectedPath) {
        if (!token && !testIdentity) {
            const response = NextResponse.redirect(new URL("/login", request.url));
            applySecurityHeaders(response, cspHeader);
            return response;
        }

        // Protected UI routes run full auth in server layouts/pages. The proxy keeps
        // the cheap cookie gate, but avoids the loopback get-session round-trip.
        const skipProxySessionValidation = SERVER_GUARDED_PROTECTED_PATH_PREFIXES.some((path) => pathname.startsWith(path));

        if (!skipProxySessionValidation) {
            const validation = testIdentity
                ? {
                    status: "valid" as const,
                    session: { user: { id: testIdentity.userId, email: testIdentity.email, onboardingCompletedAt: testIdentity.onboardingCompletedAt ?? null } },
                }
                : token
                    ? await getSession(request, token)
                    : { status: "invalid" as const };
            if (validation.status === "invalid") {
                const response = NextResponse.redirect(new URL("/login", request.url));
                deleteBetterAuthSessionCookies(response);
                response.cookies.delete(E2E_TEST_AUTH_COOKIE);
                applySecurityHeaders(response, cspHeader);
                return response;
            }
        }
    } else if (pathname === "/" || pathname === "/login" || pathname === "/signup") {
        if (token || testIdentity) {
            const validation = testIdentity
                ? {
                    status: "valid" as const,
                    session: { user: { id: testIdentity.userId, email: testIdentity.email, onboardingCompletedAt: testIdentity.onboardingCompletedAt ?? null } },
                }
                : token
                    ? await getSession(request, token)
                    : { status: "invalid" as const };
            if (validation.status === "valid" && validation.session.user) {
                const hasOnboarding = !!validation.session.user.onboardingCompletedAt;
                const response = NextResponse.redirect(new URL(hasOnboarding ? "/dashboard" : "/onboarding", request.url));
                applySecurityHeaders(response, cspHeader);
                return response;
            }

            // Stale session cookies after lock/revoke — clear them so login is not bounced back to dashboard.
            if (token && validation.status === "invalid") {
                const response = NextResponse.next({
                    request: { headers: requestHeaders },
                });
                deleteBetterAuthSessionCookies(response);
                applySecurityHeaders(response, cspHeader);
                return response;
            }
        }
    }

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
    applySecurityHeaders(response, cspHeader);

    return response;
}

export const config = {
    // Match all request paths except for the ones starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
