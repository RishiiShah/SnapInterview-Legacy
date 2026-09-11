import { apiJson, badRequestError, unauthorizedError } from "@/lib/api-response";
import { parseJsonBody } from "@/lib/http/request-body";
import { planIdSchema, updatePlanSchema } from "@/lib/plans/contracts";
import { planApiError } from "@/lib/plans/http";
import { withCsrfProtection } from "@/lib/route-security";
import { getSessionUserIdentity } from "@/lib/server-auth";
import {
  deleteUserInterviewPlan,
  getUserInterviewPlan,
  updateUserInterviewPlan,
} from "@/services/plan-service";

type RouteContext = { params: Promise<{ id: string }> };

async function authenticatedPlanId(context: RouteContext) {
  const authUser = await getSessionUserIdentity();
  if (!authUser) return { response: unauthorizedError() } as const;
  const { id } = await context.params;
  const parsedId = planIdSchema.safeParse(id);
  if (!parsedId.success) return { response: badRequestError("Invalid plan ID") } as const;
  return { userId: authUser.userId, planId: parsedId.data } as const;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const identity = await authenticatedPlanId(context);
    if ("response" in identity) return identity.response!;
    return apiJson({ plan: await getUserInterviewPlan(identity.userId, identity.planId) });
  } catch (error) {
    return planApiError(error, "GET /api/interview-plans/:id");
  }
}

export const PATCH = withCsrfProtection(async (request: Request, context: RouteContext) => {
  try {
    const identity = await authenticatedPlanId(context);
    if ("response" in identity) return identity.response!;
    const parsed = await parseJsonBody(request, updatePlanSchema);
    if (!parsed.ok) return parsed.response;
    const plan = await updateUserInterviewPlan({
      ownerUserId: identity.userId,
      planId: identity.planId,
      ...parsed.data,
    });
    return apiJson({ plan });
  } catch (error) {
    return planApiError(error, "PATCH /api/interview-plans/:id");
  }
});

export const DELETE = withCsrfProtection(async (_request: Request, context: RouteContext) => {
  try {
    const identity = await authenticatedPlanId(context);
    if ("response" in identity) return identity.response!;
    await deleteUserInterviewPlan(identity.userId, identity.planId);
    return apiJson({ success: true });
  } catch (error) {
    return planApiError(error, "DELETE /api/interview-plans/:id");
  }
});
