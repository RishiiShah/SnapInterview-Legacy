/**
 * Brand metadata for known companies in practice/session lists.
 * Icons load from Simple Icons CDN; unknown names fall back to initials.
 */

export type CompanyBrand = {
  /** Simple Icons slug */
  slug: string;
  /** Brand accent hex without `#` */
  color: string;
};

const ALIASES: Record<string, string> = {
  "twitter/x": "x",
  twitter: "x",
  "x (twitter)": "x",
  fb: "meta",
  facebook: "meta",
  "meta platforms": "meta",
  msft: "microsoft",
  amzn: "amazon",
  goog: "google",
  gh: "github",
  openai: "openai",
};

const BRANDS: Record<string, CompanyBrand> = {
  google: { slug: "google", color: "4285F4" },
  meta: { slug: "meta", color: "0668E1" },
  amazon: { slug: "amazon", color: "FF9900" },
  apple: { slug: "apple", color: "A2AAAD" },
  microsoft: { slug: "microsoft", color: "00A4EF" },
  netflix: { slug: "netflix", color: "E50914" },
  tesla: { slug: "tesla", color: "CC0000" },
  x: { slug: "x", color: "E8ECF4" },
  discord: { slug: "discord", color: "5865F2" },
  stripe: { slug: "stripe", color: "635BFF" },
  airbnb: { slug: "airbnb", color: "FF5A5F" },
  uber: { slug: "uber", color: "E8ECF4" },
  lyft: { slug: "lyft", color: "FF00BF" },
  spotify: { slug: "spotify", color: "1DB954" },
  dropbox: { slug: "dropbox", color: "0061FF" },
  slack: { slug: "slack", color: "4A154B" },
  github: { slug: "github", color: "E8ECF4" },
  gitlab: { slug: "gitlab", color: "FC6D26" },
  mongodb: { slug: "mongodb", color: "47A248" },
  redis: { slug: "redis", color: "FF4438" },
  shopify: { slug: "shopify", color: "7AB55C" },
  square: { slug: "square", color: "E8ECF4" },
  paypal: { slug: "paypal", color: "00457C" },
  twilio: { slug: "twilio", color: "F22F46" },
  figma: { slug: "figma", color: "F24E1E" },
  notion: { slug: "notion", color: "E8ECF4" },
  linear: { slug: "linear", color: "5E6AD2" },
  retool: { slug: "retool", color: "3D3D3D" },
  vercel: { slug: "vercel", color: "E8ECF4" },
  netlify: { slug: "netlify", color: "00C7B7" },
  ibm: { slug: "ibm", color: "054ADA" },
  oracle: { slug: "oracle", color: "F80000" },
  salesforce: { slug: "salesforce", color: "00A1E0" },
  sap: { slug: "sap", color: "0FAAFF" },
  cisco: { slug: "cisco", color: "1BA0D7" },
  intel: { slug: "intel", color: "0071C5" },
  adobe: { slug: "adobe", color: "FF0000" },
  zoom: { slug: "zoom", color: "2D8CFF" },
  atlassian: { slug: "atlassian", color: "0052CC" },
  jetbrains: { slug: "jetbrains", color: "FE2857" },
  hashicorp: { slug: "hashicorp", color: "844FBA" },
  datadog: { slug: "datadog", color: "632CA6" },
  elastic: { slug: "elastic", color: "005571" },
  openai: { slug: "openai", color: "E8ECF4" },
};

function normalizeKey(name: string): string {
  const trimmed = name.trim().toLowerCase();
  return ALIASES[trimmed] ?? trimmed.replace(/\s+/g, "");
}

export function resolveCompanyBrand(company: string | null | undefined): CompanyBrand | null {
  if (!company?.trim()) return null;
  const key = normalizeKey(company);
  if (key === "general") return null;
  return BRANDS[key] ?? null;
}

export function companyInitials(company: string | null | undefined): string {
  const label = displayCompany(company);
  const parts = label.split(/[\s/]+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

/** Display label when a session has no company set. */
export function displayCompany(company: string | null | undefined): string {
  const trimmed = company?.trim();
  return trimmed ? trimmed : "General";
}

export function simpleIconsUrl(slug: string, color: string): string {
  return `https://cdn.simpleicons.org/${slug}/${color}`;
}
