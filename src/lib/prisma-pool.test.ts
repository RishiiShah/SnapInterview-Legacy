import { describe, expect, it } from "vitest";

import { getPrismaPoolMax } from "./prisma-pool";

describe("getPrismaPoolMax", () => {
  it("allows limited development overlap without a large cold-connection burst", () => {
    expect(getPrismaPoolMax({ nodeEnv: "development" })).toBe(2);
  });

  it("keeps the default production pool conservative for serverless scaling", () => {
    expect(getPrismaPoolMax({ nodeEnv: "production" })).toBe(2);
  });

  it("uses a valid deployment override without allowing an unbounded pool", () => {
    expect(getPrismaPoolMax({ nodeEnv: "production", configuredValue: "6" })).toBe(6);
    expect(getPrismaPoolMax({ nodeEnv: "production", configuredValue: "100" })).toBe(2);
  });
});
