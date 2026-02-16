import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
    const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
    });

    if (!token) {
        const loginUrl = new URL("/login", request.url);

        // Prevent open redirect: only allow same-origin callback URLs
        const requestUrl = new URL(request.url);
        const callbackPath = requestUrl.pathname + requestUrl.search;
        loginUrl.searchParams.set("callbackUrl", callbackPath);

        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
