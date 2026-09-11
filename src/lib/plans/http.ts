import { apiJson, internalServerError } from "@/lib/api-response";
import { PlanServiceError } from "@/services/plan-service";
import { logger } from "@/utils/logger";

export function planApiError(error: unknown, route: string): Response {
  if (error instanceof PlanServiceError) {
    return apiJson({ error: error.message, code: error.code }, error.status);
  }
  logger.error("Interview plan API error", {
    route,
    error: error instanceof Error ? error.message : String(error),
  });
  return internalServerError();
}
