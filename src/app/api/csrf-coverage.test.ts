import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const API_ROOT = path.join(process.cwd(), "src/app/api");
const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;

function getRouteFiles(root: string): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      return getRouteFiles(fullPath);
    }

    return entry.isFile() && entry.name === "route.ts" ? [fullPath] : [];
  });
}

describe("API CSRF coverage", () => {
  it("wraps every mutating route handler with withCsrfProtection", () => {
    const routeFiles = getRouteFiles(API_ROOT);
    const missingCoverage: string[] = [];

    for (const routeFile of routeFiles) {
      const source = fs.readFileSync(routeFile, "utf8");

      for (const method of MUTATING_METHODS) {
        const hasMutatingExport = new RegExp(`export const ${method}\\s*=`, "m").test(source);
        if (!hasMutatingExport) {
          continue;
        }

        const hasCsrfWrapper = new RegExp(
          `export const ${method}\\s*=\\s*withCsrfProtection\\(`,
          "m",
        ).test(source);

        if (!hasCsrfWrapper) {
          missingCoverage.push(path.relative(process.cwd(), routeFile));
        }
      }
    }

    expect(missingCoverage).toEqual([]);
  });
});
