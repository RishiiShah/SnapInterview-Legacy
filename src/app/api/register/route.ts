import { prisma } from "@/lib/prisma";
import { isDisposableEmail } from "@/lib/disposable-emails";
import { sendOtpEmail } from "@/lib/email";
import { z } from "zod/v4";
import {
  apiError,
  apiJson,
  badRequestError,
  internalServerError,
} from "@/lib/api-response";
import {
  generateNumericCode,
  hashOneTimeCode,
  normalizeEmail,
  extractRequestContext,
} from "@/lib/security";
import { createRateLimiter } from "@/lib/rate-limit";
import { hashCredentialPassword } from "@/lib/password";
import { withCsrfProtection } from "@/lib/route-security";
import { logger } from "@/utils/logger";

// ── Zod schema ──
const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  email: z.email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .refine((pw) => /[A-Z]/.test(pw), "Password must contain an uppercase letter")
    .refine((pw) => /[a-z]/.test(pw), "Password must contain a lowercase letter")
    .refine((pw) => /[0-9]/.test(pw), "Password must contain a number")
    .refine((pw) => /[^A-Za-z0-9]/.test(pw), "Password must contain a special character"),
});

// ── Postgres-backed distributed rate limiter (per hashed IP) ──
const registerLimiter = createRateLimiter("register", 60 * 1000, 5); // 5 per minute per IP
// Email-scoped atomic limiter — backstops the lastOtpSentAt throttle against IP rotation / concurrent bursts.
const registerEmailLimiter = createRateLimiter("register-email", 60 * 1000, 1);
const GENERIC_REGISTER_RESPONSE = {
  success: true,
  message: "If this email can be registered, a verification code will be sent.",
};

export const POST = withCsrfProtection(async (req: Request) => {
  try {
    const { ipHash } = extractRequestContext(req.headers);
    const rateLimitKey = ipHash ?? "unknown";

    if (await registerLimiter.isLimited(rateLimitKey)) {
      return apiError("Too many requests. Please try again later.", 429);
    }

    // Parse & validate input
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0]?.message || "Invalid input";
      return badRequestError(firstError);
    }

    const { name, email, password } = result.data;
    const normalizedEmail = normalizeEmail(email);

    // Generic response on trip to avoid leaking whether the email is already pending.
    if (await registerEmailLimiter.isLimited(normalizedEmail)) {
      return apiJson(GENERIC_REGISTER_RESPONSE);
    }

    // Block disposable/temporary email services
    const emailCheck = await isDisposableEmail(normalizedEmail);
    if (emailCheck.disposable) {
      return badRequestError(
        "Please use a permanent email address. Temporary email services are not allowed."
      );
    }

    // Both operations are required for every non-disposable address: the hash
    // keeps existing-account responses constant-time, while the lookup decides
    // whether a pending registration may be written. They do not depend on one
    // another, so avoid putting a database round trip in front of the expensive
    // password hash.
    const [existingUser, passwordHash] = await Promise.all([
      prisma.user.findUnique({ where: { email: normalizedEmail } }),
      hashCredentialPassword(password),
    ]);

    if (existingUser) {
      return apiJson(GENERIC_REGISTER_RESPONSE);
    }

    // Generate OTP and store pending user (upsert to handle resends)
    const existingPendingUser = await prisma.pendingUser.findUnique({
      where: { email: normalizedEmail },
      select: { lastOtpSentAt: true },
    });

    if (
      existingPendingUser?.lastOtpSentAt &&
      Date.now() - existingPendingUser.lastOtpSentAt.getTime() < 60 * 1000
    ) {
      return apiError(
        "Please wait before requesting another verification code.",
        429
      );
    }

    const otp = generateNumericCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const otpHash = hashOneTimeCode(otp);

    await prisma.pendingUser.upsert({
      where: { email: normalizedEmail },
      update: {
        name,
        passwordHash,
        otpHash,
        attemptCount: 0,
        lockedUntil: null,
        lastOtpSentAt: new Date(),
        expiresAt,
        userId: null,
      },
      create: {
        name,
        email: normalizedEmail,
        passwordHash,
        otpHash,
        attemptCount: 0,
        lockedUntil: null,
        lastOtpSentAt: new Date(),
        expiresAt,
      },
    });

    // Send OTP email
    await sendOtpEmail(normalizedEmail, otp);

    return apiJson(GENERIC_REGISTER_RESPONSE);
  } catch (error) {
    logger.error("Registration error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
});
