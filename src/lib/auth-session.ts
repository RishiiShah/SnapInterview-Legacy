import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAMES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
  "__Secure-authjs.session-token",
  "authjs.session-token",
] as const;

export function getSessionTokenFromCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  const entries = cookieHeader.split(";").map((item) => item.trim());

  for (const cookieName of SESSION_COOKIE_NAMES) {
    const match = entries.find((entry) => entry.startsWith(`${cookieName}=`));
    if (match) {
      return decodeURIComponent(match.slice(cookieName.length + 1));
    }
  }

  return null;
}

export function getSessionTokenFromRequest(req: Request) {
  return getSessionTokenFromCookieHeader(req.headers.get("cookie"));
}

export async function getCurrentSessionRecord(req: Request) {
  const sessionToken = getSessionTokenFromRequest(req);
  if (!sessionToken) {
    return null;
  }

  return prisma.session.findUnique({
    where: { sessionToken },
    select: {
      id: true,
      sessionToken: true,
      userId: true,
      expires: true,
      revokedAt: true,
    },
  });
}