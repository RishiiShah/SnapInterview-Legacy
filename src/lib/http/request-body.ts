import { z } from "zod";

import { badRequestError } from "@/lib/api-response";

export type ParsedJsonBody<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  options?: {
    malformedMessage?: string;
    invalidMessage?: string;
  },
): Promise<ParsedJsonBody<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: badRequestError(
        options?.malformedMessage ?? "Invalid JSON body",
      ),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: badRequestError(
        options?.invalidMessage ??
          parsed.error.issues[0]?.message ??
          "Invalid request body",
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
