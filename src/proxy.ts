import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { decodeE2ETestIdentity, E2E_TEST_AUTH_COOKIE, isTestAuthEnabled } from "@/lib/test-auth";
import { logger } from "@/utils/logger";

// Better Auth prefixes secure cookies on HTTPS production origins.
const BETTER_AUTH_COOKIE_NAMES = [
    "better-auth.session_token",
    "__Secure-better-auth.session_token",
    "better-auth.session_data",
    "__Secure-better-auth.session_data",
] as const;

function getBetterAuthSessionToken(request: NextRequest) {
    for (const cookieName of BETTER_AUTH_COOKIE_NAMES) {
        const value = request.cookies.get(cookieName)?.value;
        if (value) return value;
    }
    return undefined;
}

function deleteBetterAuthSessionCookies(response: NextResponse) {
    for (const cookieName of BETTER_AUTH_COOKIE_NAMES) {
        response.cookies.delete(cookieName);
    }
}

function createNonce() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes));
}

function createContentSecurityPolicy(nonce: string, isDev: boolean) {
    return `
        default-src 'self';
        script-src 'self' 'nonce-${nonce}' ${isDev ? "'unsafe-eval'" : ""};
        style-src 'self' 'unsafe-inline';
        img-src 'self' https://lh3.googleusercontent.com data: blob:;
        font-src 'self' data:;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        connect-src 'self' https://accounts.google.com https://www.googleapis.com https://*.amazonaws.com;
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

/**
 * Validates the session with the Better Auth server.
 */
async function getSession(request: NextRequest) {
    try {
        const sessionRes = await fetch(`${env.BETTER_AUTH_URL}/api/auth/get-session`, {
            headers: { cookie: request.headers.get("cookie") || "" },
        });
        if (!sessionRes.ok) return null;
        const sessionData = await sessionRes.json();
        return sessionData && sessionData.user ? sessionData : null;
    } catch (err) {
        logger.warn("Proxy session validation failed", {
            error: err instanceof Error ? err.message : String(err),
        });
        return null;
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
    const protectedPaths = ["/dashboard", "/practice", "/questions", "/analytics", "/recordings", "/settings", "/onboarding", "/interview", "/admin"];
    const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

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

        // Admin routes run full auth + isAdmin checks in the admin layout.
        // Skipping the proxy HTTP session round-trip avoids doubling get-session latency.
        const skipProxySessionValidation = pathname.startsWith("/admin");

        if (!skipProxySessionValidation) {
            const session = testIdentity
                ? { user: { id: testIdentity.userId, email: testIdentity.email, onboardingCompletedAt: testIdentity.onboardingCompletedAt ?? null } }
                : await getSession(request);
            if (!session) {
                const response = NextResponse.redirect(new URL("/login", request.url));
                deleteBetterAuthSessionCookies(response);
                response.cookies.delete(E2E_TEST_AUTH_COOKIE);
                applySecurityHeaders(response, cspHeader);
                return response;
            }
        }
    } else if (pathname === "/" || pathname === "/login" || pathname === "/signup") {
        if (token || testIdentity) {
            const session = testIdentity
                ? { user: { id: testIdentity.userId, email: testIdentity.email, onboardingCompletedAt: testIdentity.onboardingCompletedAt ?? null } }
                : await getSession(request);
            if (session?.user) {
                const hasOnboarding = !!session.user.onboardingCompletedAt;
                const response = NextResponse.redirect(new URL(hasOnboarding ? "/dashboard" : "/onboarding", request.url));
                applySecurityHeaders(response, cspHeader);
                return response;
            }

            // Stale session cookies after lock/revoke — clear them so login is not bounced back to dashboard.
            if (token && !session) {
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
