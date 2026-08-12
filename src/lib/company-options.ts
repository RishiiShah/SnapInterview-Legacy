export const COMPANIES = [
  "General",
  "Google",
  "Meta",
  "Amazon",
  "Apple",
  "Microsoft",
  "Netflix",
  "Tesla",
  "Twitter/X",
  "Discord",
  "Stripe",
  "Airbnb",
  "Uber",
  "Lyft",
  "Spotify",
  "Dropbox",
  "Slack",
  "GitHub",
  "GitLab",
  "MongoDB",
  "Redis",
  "Shopify",
  "Square",
  "PayPal",
  "Twilio",
  "Figma",
  "Notion",
  "Linear",
  "Retool",
  "Vercel",
  "Netlify",
  "IBM",
  "Oracle",
  "Salesforce",
  "SAP",
  "Cisco",
  "Intel",
  "Adobe",
  "Zoom",
  "Atlassian",
  "JetBrains",
  "HashiCorp",
  "Datadog",
  "Elastic",
] as const;

const BLOCKED_COMPANY_REQUESTS = new Set(["pornhub"]);

export function normalizeCompanyName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function isCuratedCompany(value: string): boolean {
  const normalizedValue = normalizeCompanyName(value);
  return COMPANIES.some((company) => normalizeCompanyName(company) === normalizedValue);
}

export function isBlockedCompanyRequest(value: string): boolean {
  return BLOCKED_COMPANY_REQUESTS.has(normalizeCompanyName(value));
}
