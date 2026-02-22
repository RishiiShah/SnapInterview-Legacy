import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
    // 1. Setup headers for the request (e.g., nonce for CSP)
    const requestHeaders = new Headers(request.headers);
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    requestHeaders.set("x-nonce", nonce);

    // 2. Auth checks
    // We only want to protect specific routes. The matcher is now set to run on all pages for the security headers,
    // so we handle the route protection manually.
    const protectedPaths = ["/dashboard", "/practice", "/questions", "/analytics", "/settings"];
    const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));

    let response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    if (isProtectedPath) {
        const token = await getToken({
            req: request,
            secret: process.env.AUTH_SECRET,
        });

        if (!token) {
            const loginUrl = new URL("/login", request.url);
            const callbackPath = request.nextUrl.pathname + request.nextUrl.search;
            loginUrl.searchParams.set("callbackUrl", callbackPath);
            response = NextResponse.redirect(loginUrl);
        }
    }

    // 3. Apply Security Headers
    const isDev = process.env.NODE_ENV !== "production";
    const cspHeader = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""};
        style-src 'self' 'unsafe-inline';
        img-src 'self' https://lh3.googleusercontent.com data: blob:;
        font-src 'self' data:;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        connect-src 'self' https://accounts.google.com https://www.googleapis.com;
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
