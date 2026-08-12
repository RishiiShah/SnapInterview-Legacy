import { z } from "zod/v4";
import { apiError, apiJson, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";
import { isCuratedCompany, normalizeCompanyName } from "@/lib/company-options";
import { prisma } from "@/lib/prisma";
import { createRateLimiter } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/route-security";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { logger } from "@/utils/logger";

const companyRequestSchema = z.object({
  company: z.string().transform((value) => value.normalize("NFKC").trim().replace(/\s+/g, " ")).pipe(
    z.string().min(2, "Company name must be at least 2 characters").max(100, "Company name is too long")
      .regex(/^[\p{L}\p{N}][\p{L}\p{N}&.,'’()\- ]*$/u, "Company name contains unsupported characters"),
  ),
});
const companyRequestLimiter = createRateLimiter("company-request", 24 * 60 * 60 * 1000, 5);

export const POST = withCsrfProtection(async (req: Request) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();
    if (await companyRequestLimiter.isLimited(authUser.userId)) {
      return apiError("Too many company requests. Please try again tomorrow.", 429);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequestError("Invalid JSON body");
    }
    const parsed = companyRequestSchema.safeParse(body);
    if (!parsed.success) return badRequestError(parsed.error.issues[0]?.message || "Invalid company request");

    const requestedName = parsed.data.company;
    if (isCuratedCompany(requestedName)) {
      return badRequestError("That company is already available in the list");
    }

    await prisma.companyRequest.upsert({
      where: { normalizedName: normalizeCompanyName(requestedName) },
      create: {
        requestedName,
        normalizedName: normalizeCompanyName(requestedName),
        userId: authUser.userId,
      },
      update: {},
    });

    return apiJson({ message: "Company request received. Use General until it is reviewed." }, 201);
  } catch (error) {
    logger.error("Create company request error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
});
