import { apiJson, unauthorizedError } from "@/lib/api-response";
import { withCsrfProtection } from "@/lib/route-security";
import { getSessionUserIdentity } from "@/lib/server-auth";

export const POST = withCsrfProtection(async () => {
  const authUser = await getSessionUserIdentity();
  if (!authUser) {
    return unauthorizedError();
  }

  return apiJson(
    { error: "Server-side grading is not configured for coding practice." },
    501,
  );
});
