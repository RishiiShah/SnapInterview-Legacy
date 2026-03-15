import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/utils/logger";

// Better Auth sets this cookie on login
const BETTER_AUTH_COOKIE = "better-auth.session_token";

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
    // 1. Setup headers for the request (e.g., nonce for CSP)
    const requestHeaders = new Headers(request.headers);
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    requestHeaders.set("x-nonce", nonce);

    const { pathname } = request.nextUrl;

    // 2. Auth checks
    const protectedPaths = ["/dashboard", "/practice", "/questions", "/analytics", "/recordings", "/settings", "/onboarding", "/interview"];
    const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

    const token = request.cookies.get(BETTER_AUTH_COOKIE)?.value;

    if (isProtectedPath) {
        if (!token) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        const session = await getSession(request);
        if (!session) {
            const response = NextResponse.redirect(new URL("/login", request.url));
            response.cookies.delete(BETTER_AUTH_COOKIE);
            return response;
        }
    } else if (pathname === "/" || pathname === "/login" || pathname === "/signup") {
        if (token) {
            const session = await getSession(request);
            if (session?.user) {
                const hasOnboarding = !!session.user.onboardingCompletedAt;
                return NextResponse.redirect(new URL(hasOnboarding ? "/dashboard" : "/onboarding", request.url));
            }
        }
    }

    let response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // 3. Apply Security Headers
    const isDev = process.env.NODE_ENV !== "production";
    const cspHeader = `
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

    response.headers.set("Content-Security-Policy", cspHeader);
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");

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
