import crypto from "crypto";
import { env } from "@/lib/env";

/**
 * Constant-time verification of the `Authorization: Bearer <CRON_SECRET>` header
 * used to gate cron endpoints. Fails closed when CRON_SECRET is unset.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  if (!env.CRON_SECRET) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const expected = `Bearer ${env.CRON_SECRET}`;
  const provided = Buffer.from(authHeader);
  const expectedBuffer = Buffer.from(expected);

  if (provided.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(provided, expectedBuffer);
}
