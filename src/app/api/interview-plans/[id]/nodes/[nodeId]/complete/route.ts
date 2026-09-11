import { apiJson, badRequestError, unauthorizedError } from "@/lib/api-response";
import { parseJsonBody } from "@/lib/http/request-body";
import { completePlanNodeSchema, planIdSchema, planNodeIdSchema } from "@/lib/plans/contracts";
import { planApiError } from "@/lib/plans/http";
import { withCsrfProtection } from "@/lib/route-security";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { completeUserInterviewPlanNode } from "@/services/plan-service";

export const POST = withCsrfProtection(async (
  request: Request,
  { params }: { params: Promise<{ id: string; nodeId: string }> },
) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();
    const values = await params;
    const planId = planIdSchema.safeParse(values.id);
    const nodeId = planNodeIdSchema.safeParse(values.nodeId);
    if (!planId.success || !nodeId.success) return badRequestError("Invalid plan or node ID");
    const parsed = await parseJsonBody(request, completePlanNodeSchema);
    if (!parsed.ok) return parsed.response;
    const plan = await completeUserInterviewPlanNode({
      ownerUserId: authUser.userId,
      planId: planId.data,
      nodeId: nodeId.data,
      score: parsed.data.score,
    });
    return apiJson({ plan });
  } catch (error) {
    return planApiError(error, "POST /api/interview-plans/:id/nodes/:nodeId/complete");
  }
});
