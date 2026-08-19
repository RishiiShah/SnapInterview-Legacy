import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseJsonBody } from "@/lib/http/request-body";

function jsonRequest(body: string) {
  return new Request("http://localhost/api/example", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
}

describe("parseJsonBody", () => {
  it("returns the default 400 response for malformed JSON", async () => {
    const result = await parseJsonBody(
      jsonRequest("not-json"),
      z.object({ name: z.string() }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toEqual({
        error: "Invalid JSON body",
      });
    }
  });

  it("uses the configured malformed JSON message", async () => {
    const result = await parseJsonBody(
      jsonRequest("{"),
      z.object({ name: z.string() }),
      { malformedMessage: "Malformed payload" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toEqual({
        error: "Malformed payload",
      });
    }
  });

  it("returns the first schema issue for invalid JSON data", async () => {
    const result = await parseJsonBody(
      jsonRequest(JSON.stringify({ name: "Al" })),
      z.object({ name: z.string().min(3, "Name is too short") }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toEqual({
        error: "Name is too short",
      });
    }
  });

  it("uses the configured invalid-data message instead of schema details", async () => {
    const result = await parseJsonBody(
      jsonRequest(JSON.stringify({ name: 42 })),
      z.object({ name: z.string() }),
      { invalidMessage: "Invalid request body" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toEqual({
        error: "Invalid request body",
      });
    }
  });

  it("returns validated and transformed data", async () => {
    const result = await parseJsonBody(
      jsonRequest(JSON.stringify({ name: "  Ada  " })),
      z.object({ name: z.string().trim() }),
    );

    expect(result).toEqual({ ok: true, data: { name: "Ada" } });
  });

  it("does not catch errors raised after JSON parsing", async () => {
    const downstreamError = new Error("downstream schema work failed");
    const schema = z.string().transform(() => {
      throw downstreamError;
    });

    await expect(
      parseJsonBody(jsonRequest(JSON.stringify("value")), schema),
    ).rejects.toBe(downstreamError);
  });
});
