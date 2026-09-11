import { apiJson, unauthorizedError } from "@/lib/api-response";
import { parseJsonBody } from "@/lib/http/request-body";
import { createPlanSchema } from "@/lib/plans/contracts";
import { planApiError } from "@/lib/plans/http";
import { withCsrfProtection } from "@/lib/route-security";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { createUserInterviewPlan, listUserInterviewPlans } from "@/services/plan-service";

export async function GET() {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();
    return apiJson({ plans: await listUserInterviewPlans(authUser.userId) });
  } catch (error) {
    return planApiError(error, "GET /api/interview-plans");
  }
}

export const POST = withCsrfProtection(async (request: Request) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();
    const parsed = await parseJsonBody(request, createPlanSchema);
    if (!parsed.ok) return parsed.response;
    const plan = await createUserInterviewPlan({
      ownerUserId: authUser.userId,
      title: parsed.data.title,
      templateKey: parsed.data.template_key,
    });
    return apiJson({ plan }, 201);
  } catch (error) {
    return planApiError(error, "POST /api/interview-plans");
  }
});
