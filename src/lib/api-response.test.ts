import { describe, expect, it } from "vitest";

import {
  apiError,
  apiJson,
  badGatewayError,
  badRequestError,
  conflictError,
  internalServerError,
  notFoundError,
  tooManyRequestsError,
  unauthorizedError,
} from "@/lib/api-response";

async function expectJsonResponse(
  response: Response,
  status: number,
  body: unknown,
) {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toEqual(body);
}

describe("API responses", () => {
  it("returns JSON with the default success status", async () => {
    await expectJsonResponse(apiJson({ value: 1 }), 200, { value: 1 });
  });

  it("returns JSON with an explicit success status", async () => {
    await expectJsonResponse(apiJson({ created: true }, 201), 201, {
      created: true,
    });
  });

  it("wraps an API error message at the requested status", async () => {
    await expectJsonResponse(apiError("Nope", 418), 418, { error: "Nope" });
  });

  it.each([
    ["unauthorized", unauthorizedError(), 401, "Unauthorized"],
    ["bad request", badRequestError("Invalid input"), 400, "Invalid input"],
    ["not found", notFoundError("Missing"), 404, "Missing"],
    ["conflict", conflictError("Already exists"), 409, "Already exists"],
    ["rate limit", tooManyRequestsError("Slow down"), 429, "Slow down"],
    ["bad gateway", badGatewayError("Provider failed"), 502, "Provider failed"],
  ])("returns the %s error response", async (_name, response, status, message) => {
    await expectJsonResponse(response, status, { error: message });
  });

  it("returns the default internal-server error message", async () => {
    await expectJsonResponse(internalServerError(), 500, {
      error: "Something went wrong",
    });
  });

  it("returns a custom internal-server error message", async () => {
    await expectJsonResponse(internalServerError("Try later"), 500, {
      error: "Try later",
    });
  });
});
