import { apiJson, badRequestError, unauthorizedError } from "@/lib/api-response";
import { parseJsonBody } from "@/lib/http/request-body";
import { planGraphSchema, planIdSchema } from "@/lib/plans/contracts";
import { planApiError } from "@/lib/plans/http";
import { withCsrfProtection } from "@/lib/route-security";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { saveUserInterviewPlanGraph } from "@/services/plan-service";

export const PUT = withCsrfProtection(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();
    const parsedId = planIdSchema.safeParse((await params).id);
    if (!parsedId.success) return badRequestError("Invalid plan ID");
    const parsed = await parseJsonBody(request, planGraphSchema);
    if (!parsed.ok) return parsed.response;
    const plan = await saveUserInterviewPlanGraph({
      ownerUserId: authUser.userId,
      planId: parsedId.data,
      graph: parsed.data,
    });
    return apiJson({ plan });
  } catch (error) {
    return planApiError(error, "PUT /api/interview-plans/:id/graph");
  }
});
