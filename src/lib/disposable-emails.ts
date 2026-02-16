/**
 * Multi-layer disposable email detection.
 *
 * Layer 1: 121k+ known disposable domains (npm package, updated regularly)
 * Layer 2: Known temp-mail.org MX server patterns
 * Layer 3: DNS MX record heuristics for suspicious self-hosted mail
 */

import disposableDomains from "disposable-email-domains";
import dns from "dns/promises";

// Layer 1: Build a Set for O(1) lookups from the 121k+ domain list
const DISPOSABLE_SET = new Set<string>(disposableDomains);

// Layer 2: MX hostnames used by temp-mail.org and similar services.
// These services route all their rotating domains through the same mail servers.
const SUSPICIOUS_MX_PATTERNS = [
    /^mail\.[a-z0-9-]+\.[a-z]{2,4}$/i,     // mail.<domain> (self-referencing MX, common in temp services)
    /privateemail\.com$/i,                    // Namecheap private email (heavily abused)
    /temp-mail/i,
    /tempmail/i,
    /disposable/i,
    /throwaway/i,
    /trash-?mail/i,
    /guerrilla/i,
    /yopmail/i,
];

// Layer 2b: Exact MX hostnames known to serve disposable email services
const KNOWN_DISPOSABLE_MX = new Set([
    "mx1.temp-mail.org",
    "mx2.temp-mail.org",
    "mx3.temp-mail.org",
    "mx4.temp-mail.org",
    "mx.yopmail.com",
    "mail.privateemail.com",
]);

/**
 * Check if an email domain is disposable using multiple detection layers.
 * Returns { disposable: true/false, reason: string }
 */
export async function isDisposableEmail(email: string): Promise<{
    disposable: boolean;
    reason?: string;
}> {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return { disposable: false };

    // Layer 1: Check against 121k+ known disposable domains
    if (DISPOSABLE_SET.has(domain)) {
        return { disposable: true, reason: "known-disposable-domain" };
    }

    // Layer 2: DNS MX record check for suspicious mail server patterns
    try {
        const mxRecords = await dns.resolveMx(domain);

        if (!mxRecords || mxRecords.length === 0) {
            // No MX records at all — can't receive email
            return { disposable: true, reason: "no-mx-records" };
        }

        for (const mx of mxRecords) {
            const mxHost = mx.exchange.toLowerCase();

            // Check known disposable MX hostnames
            if (KNOWN_DISPOSABLE_MX.has(mxHost)) {
                return { disposable: true, reason: "known-disposable-mx" };
            }

            // Check suspicious MX patterns
            for (const pattern of SUSPICIOUS_MX_PATTERNS) {
                if (pattern.test(mxHost)) {
                    // Self-referencing MX (mail.<same-domain>) is a strong signal
                    // for temp-mail.org style services
                    if (mxHost === `mail.${domain}`) {
                        return { disposable: true, reason: "self-referencing-mx" };
                    }
                }
            }
        }
    } catch {
        // DNS lookup failed — domain might not exist
        return { disposable: true, reason: "dns-lookup-failed" };
    }

    return { disposable: false };
}
