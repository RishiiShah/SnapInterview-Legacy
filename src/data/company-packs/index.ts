import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { logger } from "@/utils/logger";

export type CompanyTheme = {
  id: string;
  shape: string;
  types: string[];
};

export type CompanyPack = {
  id: string;
  version: number;
  displayNames: string[];
  method: string[];
  signalsByLevel: {
    "entry-level"?: string[];
    "mid-level"?: string[];
    "senior"?: string[];
    "staff-plus"?: string[];
    [key: string]: string[] | undefined;
  };
  signalsByRoleFamily: {
    swe?: string[];
    "ml-data"?: string[];
    "sre-infra"?: string[];
    "pm-design"?: string[];
    "em-lead"?: string[];
    quant?: string[];
    [key: string]: string[] | undefined;
  };
  frequentThemes: CompanyTheme[];
  sourcesNote?: string;
};

export const companyPackSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().nonnegative(),
  displayNames: z.array(z.string().min(1)),
  method: z.array(z.string().min(1)),
  signalsByLevel: z.record(z.string(), z.array(z.string().min(1))),
  signalsByRoleFamily: z.record(z.string(), z.array(z.string().min(1))),
  frequentThemes: z.array(
    z.object({
      id: z.string().min(1),
      shape: z.string().min(1),
      types: z.array(z.string().min(1)),
    })
  ),
  sourcesNote: z.string().min(1).optional(),
});

const COMPANY_PACK_CACHE = new Map<string, CompanyPack>();

function cleanLookupKey(input: string | null | undefined): string {
  if (!input) return "";
  return input.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const RAW_KNOWN_COMPANY_ALIASES: Record<string, string> = {
  amazon: "amazon",
  aws: "amazon",
  "amazon web services": "amazon",
  "amazonwebservices": "amazon",
  google: "google",
  alphabet: "google",
  "google llc": "google",
  meta: "meta",
  facebook: "meta",
  instagram: "meta",
  "meta platforms": "meta",
  apple: "apple",
  "apple inc": "apple",
  microsoft: "microsoft",
  azure: "microsoft",
  "microsoft corporation": "microsoft",
  netflix: "netflix",
  stripe: "stripe",
  uber: "uber",
  airbnb: "airbnb",
};

const RAW_COMPANY_TO_FAMILY_MAP: Record<string, string> = {
  // Payments / Fintech
  square: "payments",
  block: "payments",
  paypal: "payments",
  plaid: "payments",
  adyen: "payments",
  robinhood: "payments",
  coinbase: "payments",
  affirm: "payments",

  // Marketplace & E-commerce
  shopify: "marketplace",
  lyft: "marketplace",
  doordash: "marketplace",
  instacart: "marketplace",
  ebay: "marketplace",
  etsy: "marketplace",

  // Infra & DevTools
  github: "infra-devtools",
  gitlab: "infra-devtools",
  mongodb: "infra-devtools",
  redis: "infra-devtools",
  vercel: "infra-devtools",
  netlify: "infra-devtools",
  cloudflare: "infra-devtools",
  datadog: "infra-devtools",
  hashicorp: "infra-devtools",
  snowflake: "infra-devtools",
  databricks: "infra-devtools",
  twilio: "infra-devtools",

  // Enterprise & SaaS
  salesforce: "enterprise",
  oracle: "enterprise",
  ibm: "enterprise",
  slack: "enterprise",
  atlassian: "enterprise",
  workday: "enterprise",
  servicenow: "enterprise",
  box: "enterprise",
  dropbox: "enterprise",
  zoom: "enterprise",
  notion: "enterprise",
  linear: "enterprise",
  retool: "enterprise",
  figma: "enterprise",

  // Consumer Social / Media / Gaming
  spotify: "consumer-social",
  "twitter/x": "consumer-social",
  twitter: "consumer-social",
  x: "consumer-social",
  discord: "consumer-social",
  snap: "consumer-social",
  snapchat: "consumer-social",
  pinterest: "consumer-social",
  reddit: "consumer-social",
  tiktok: "consumer-social",
  bytedance: "consumer-social",
  roblox: "consumer-social",
  epic: "consumer-social",
  tesla: "infra-devtools",
};

const KNOWN_DEEP_COMPANIES = new Set(Object.values(RAW_KNOWN_COMPANY_ALIASES));

// Pre-index clean alphanumeric keys
const KNOWN_COMPANY_ALIASES: Record<string, string> = {};
for (const [k, v] of Object.entries(RAW_KNOWN_COMPANY_ALIASES)) {
  KNOWN_COMPANY_ALIASES[cleanLookupKey(k)] = v;
}

const COMPANY_TO_FAMILY_MAP: Record<string, string> = {};
for (const [k, v] of Object.entries(RAW_COMPANY_TO_FAMILY_MAP)) {
  COMPANY_TO_FAMILY_MAP[cleanLookupKey(k)] = v;
}

export function normalizeCompanyKey(company: string | null | undefined): string {
  if (!company) return "general";
  const cleaned = cleanLookupKey(company);
  if (!cleaned || cleaned === "general") return "general";
  return KNOWN_COMPANY_ALIASES[cleaned] ?? COMPANY_TO_FAMILY_MAP[cleaned] ?? cleaned;
}

export function inferRoleFamily(roleSlug: string): "swe" | "ml-data" | "sre-infra" | "pm-design" | "em-lead" | "quant" {
  if (roleSlug.includes("machine-learning") || roleSlug.includes("ai-") || roleSlug.includes("data-") || roleSlug.includes("analytics")) {
    return "ml-data";
  }
  if (roleSlug.includes("sre") || roleSlug.includes("devops") || roleSlug.includes("platform") || roleSlug.includes("cloud") || roleSlug.includes("security") || roleSlug.includes("systems")) {
    return "sre-infra";
  }
  if (roleSlug.includes("product-manager") || roleSlug.includes("tpm") || roleSlug.includes("product-designer") || roleSlug.includes("design-engineer") || roleSlug.includes("ui-") || roleSlug.includes("ux-")) {
    return "pm-design";
  }
  if (roleSlug.includes("manager") || roleSlug.includes("tech-lead") || roleSlug.includes("staff")) {
    return "em-lead";
  }
  if (roleSlug.includes("quant")) {
    return "quant";
  }
  return "swe";
}

async function loadPackFile(relativePath: string): Promise<CompanyPack | null> {
  const fullPath = path.join(process.cwd(), "src/data/company-packs", relativePath);
  try {
    const content = await fs.readFile(fullPath, "utf-8");
    return companyPackSchema.parse(JSON.parse(content));
  } catch (err) {
    logger.warn("Could not load company pack file", { fullPath, error: String(err) });
    return null;
  }
}

export async function resolveCompanyPack(
  company: string | null | undefined,
  roleSlug: string,
  level?: string
): Promise<{
  pack: CompanyPack;
  resolvedKey: string;
  methodSummary: string;
  levelSignals: string[];
  roleFamilySignals: string[];
  filteredThemes: CompanyTheme[];
}> {
  const normKey = normalizeCompanyKey(company);
  const roleFamily = inferRoleFamily(roleSlug);
  const normLevel = level && ["entry-level", "mid-level", "senior", "staff-plus"].includes(level) ? level : "mid-level";

  let pack: CompanyPack | null = null;

  // 1. Direct Deep Company Pack
  if (COMPANY_PACK_CACHE.has(normKey)) {
    pack = COMPANY_PACK_CACHE.get(normKey)!;
  } else {
    // Check if it is a known deep company
    if (KNOWN_DEEP_COMPANIES.has(normKey)) {
      pack = await loadPackFile(`companies/${normKey}.json`);
    } else if (["payments", "marketplace", "infra-devtools", "enterprise", "consumer-social"].includes(normKey)) {
      pack = await loadPackFile(`families/${normKey}.json`);
    }

    if (!pack) {
      // Check family mapping
      const family = COMPANY_TO_FAMILY_MAP[normKey];
      if (family) {
        pack = await loadPackFile(`families/${family}.json`);
      }
    }

    if (!pack) {
      pack = await loadPackFile("general.json");
    }

    if (!pack) {
      // Hard fallback
      pack = {
        id: "general",
        version: 1,
        displayNames: ["General Technology"],
        method: [
          "Standard engineering hiring bar focusing on core fundamentals",
          "Balanced focus on practical execution, problem solving, and architecture",
        ],
        signalsByLevel: {
          "entry-level": ["Solid understanding of fundamentals, data structures, and learning aptitude."],
          "mid-level": ["Demonstrated ownership of feature delivery and self-directed problem solving."],
          "senior": ["End-to-end architectural leadership, ambiguity handling, and cross-team impact."],
          "staff-plus": ["Strategic technical vision, multi-system scalability, and mentoring engineering talent."],
        },
        signalsByRoleFamily: {
          swe: ["Clean code, pragmatic testing, and sound architecture."],
          "ml-data": ["Sound statistical modeling, data pipeline reliability, and production ML lifecycle."],
          "sre-infra": ["Reliability, high availability, observability, and infrastructure as code."],
        },
        frequentThemes: [
          {
            id: "core-problem-solving",
            shape: "Break down an ambiguous engineering requirement into concrete trade-offs and steps.",
            types: ["behavioral-leadership", "system-design", "domain-role", "coding-algorithms"],
          },
        ],
      };
    }

    COMPANY_PACK_CACHE.set(normKey, pack);
  }

  const methodSummary = pack.method.join(". ");
  const levelSignals = pack.signalsByLevel[normLevel] ?? pack.signalsByLevel["mid-level"] ?? [];
  const roleFamilySignals = pack.signalsByRoleFamily[roleFamily] ?? pack.signalsByRoleFamily["swe"] ?? [];
  const filteredThemes = pack.frequentThemes;

  return {
    pack,
    resolvedKey: normKey,
    methodSummary,
    levelSignals,
    roleFamilySignals,
    filteredThemes,
  };
}
