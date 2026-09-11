import { apiJson, badRequestError, unauthorizedError } from "@/lib/api-response";
import { planIdSchema, planNodeIdSchema } from "@/lib/plans/contracts";
import { planApiError } from "@/lib/plans/http";
import { withCsrfProtection } from "@/lib/route-security";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { skipUserInterviewPlanNode } from "@/services/plan-service";

export const POST = withCsrfProtection(async (
  _request: Request,
  { params }: { params: Promise<{ id: string; nodeId: string }> },
) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();
    const values = await params;
    const planId = planIdSchema.safeParse(values.id);
    const nodeId = planNodeIdSchema.safeParse(values.nodeId);
    if (!planId.success || !nodeId.success) return badRequestError("Invalid plan or node ID");
    const plan = await skipUserInterviewPlanNode({
      ownerUserId: authUser.userId,
      planId: planId.data,
      nodeId: nodeId.data,
    });
    return apiJson({ plan });
  } catch (error) {
    return planApiError(error, "POST /api/interview-plans/:id/nodes/:nodeId/skip");
  }
});
