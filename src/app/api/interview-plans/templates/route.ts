import { apiJson, unauthorizedError } from "@/lib/api-response";
import { planApiError } from "@/lib/plans/http";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { getInterviewPlanTemplates } from "@/services/plan-service";

export async function GET() {
  try {
    if (!await getSessionUserIdentity()) return unauthorizedError();
    return apiJson({ templates: getInterviewPlanTemplates() });
  } catch (error) {
    return planApiError(error, "GET /api/interview-plans/templates");
  }
}
