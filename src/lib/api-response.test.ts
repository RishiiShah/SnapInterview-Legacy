import { describe, expect, it } from "vitest";
import {
  apiError,
  apiJson,
  badRequestError,
  internalServerError,
  notFoundError,
  unauthorizedError,
} from "./api-response";

describe("api response helpers", () => {
  it("apiJson returns the expected JSON body and status", async () => {
    const res = apiJson({ ok: true, count: 2 }, 201);

    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(201);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    await expect(res.json()).resolves.toEqual({ ok: true, count: 2 });
  });

  it("apiJson defaults to status 200", async () => {
    const res = apiJson({ ok: true });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("apiError returns { error } JSON and the given status", async () => {
    const res = apiError("Forbidden", 403);

    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("named helpers preserve status codes and error shapes", async () => {
    await expect(unauthorizedError().json()).resolves.toEqual({ error: "Unauthorized" });
    expect(unauthorizedError().status).toBe(401);

    await expect(badRequestError("bad input").json()).resolves.toEqual({ error: "bad input" });
    expect(badRequestError("bad input").status).toBe(400);

    await expect(notFoundError("missing").json()).resolves.toEqual({ error: "missing" });
    expect(notFoundError("missing").status).toBe(404);

    await expect(internalServerError().json()).resolves.toEqual({
      error: "Something went wrong",
    });
    expect(internalServerError().status).toBe(500);
  });
});
