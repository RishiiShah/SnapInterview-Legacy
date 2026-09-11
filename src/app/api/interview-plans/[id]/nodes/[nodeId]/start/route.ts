import { apiJson, badRequestError, unauthorizedError } from "@/lib/api-response";
import { parseJsonBody } from "@/lib/http/request-body";
import { planIdSchema, planNodeIdSchema, startPlanNodeSchema } from "@/lib/plans/contracts";
import { planApiError } from "@/lib/plans/http";
import { withCsrfProtection } from "@/lib/route-security";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { startUserInterviewPlanNode } from "@/services/plan-service";

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
    const parsed = await parseJsonBody(request, startPlanNodeSchema);
    if (!parsed.ok) return parsed.response;
    return apiJson(await startUserInterviewPlanNode({
      ownerUserId: authUser.userId,
      planId: planId.data,
      nodeId: nodeId.data,
      interviewId: parsed.data.interview_id,
    }));
  } catch (error) {
    return planApiError(error, "POST /api/interview-plans/:id/nodes/:nodeId/start");
  }
});
