import { describe, expect, it } from "vitest";
import {
  categoryMatchesPreferred,
  inferPreferredCategories,
} from "./retrieval-categories";

describe("inferPreferredCategories", () => {
  it("maps kafka/redis/postgres terms onto distributed and database categories", () => {
    const categories = inferPreferredCategories({
      interviewType: "system-design",
      technicalTerms: ["Kafka", "Redis", "PostgreSQL", "lock", "transaction"],
    });

    expect(categories).toEqual(
      expect.arrayContaining(["Distributed Systems", "Database and SQL", "System Design"])
    );
    expect(categories).not.toContain("Security");
    expect(categories[0]).not.toBe("Security");
  });

  it("keeps frontend terms away from devops defaults", () => {
    const categories = inferPreferredCategories({
      interviewType: "domain-role",
      technicalTerms: ["React", "memo", "virtualization"],
    });
    expect(categories).toEqual(
      expect.arrayContaining(["Front-end", "Web Development"])
    );
  });
});

describe("categoryMatchesPreferred", () => {
  it("distinguishes exact, soft, and none matches", () => {
    expect(
      categoryMatchesPreferred("Distributed Systems", ["Distributed Systems", "Database and SQL"])
    ).toBe("exact");
    expect(categoryMatchesPreferred("Distributed Systems", ["System Design"])).toBe("soft");
    expect(categoryMatchesPreferred("Security", ["Distributed Systems", "Database and SQL"])).toBe(
      "none"
    );
  });
});
