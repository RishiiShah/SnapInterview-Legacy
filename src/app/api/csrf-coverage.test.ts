import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const API_ROOT = path.join(process.cwd(), "src/app/api");
const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;
type MutatingMethod = (typeof MUTATING_METHODS)[number];

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

function getExportSection(source: string, exportIndex: number) {
  const nextExportIndex = source.indexOf("\nexport ", exportIndex + 1);
  return nextExportIndex === -1
    ? source.slice(exportIndex)
    : source.slice(exportIndex, nextExportIndex);
}

function hasCoveredMutatingHandler(source: string, method: MutatingMethod) {
  const constExport = new RegExp(`export const ${method}\\s*=`, "m").exec(source);
  if (constExport) {
    const section = getExportSection(source, constExport.index);
    return section.includes(`export const ${method}`) && section.includes("withCsrfProtection(");
  }

  const functionExport = new RegExp(`export async function ${method}\\s*\\(`, "m").exec(source);
  if (functionExport) {
    const section = getExportSection(source, functionExport.index);
    return section.includes("csrfRejectIfInvalid(");
  }

  return true;
}

describe("API CSRF coverage", () => {
  it("detects coverage for const-wrapped and manual async handlers", () => {
    expect(hasCoveredMutatingHandler(
      "export const POST = withCsrfProtection(async () => {})",
      "POST"
    )).toBe(true);
    expect(hasCoveredMutatingHandler(
      "export async function DELETE(request: Request) { const csrfError = await csrfRejectIfInvalid(request); }",
      "DELETE"
    )).toBe(true);
    expect(hasCoveredMutatingHandler(
      "export async function PATCH(request: Request) { return Response.json({ ok: true }); }",
      "PATCH"
    )).toBe(false);
  });

  it("wraps every mutating route handler with withCsrfProtection", () => {
    const routeFiles = getRouteFiles(API_ROOT);
    const missingCoverage: string[] = [];

    for (const routeFile of routeFiles) {
      const source = fs.readFileSync(routeFile, "utf8");

      for (const method of MUTATING_METHODS) {
        if (!hasCoveredMutatingHandler(source, method)) {
          missingCoverage.push(path.relative(process.cwd(), routeFile));
        }
      }
    }

    expect(missingCoverage).toEqual([]);
  });
});
