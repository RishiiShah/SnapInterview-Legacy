/**
 * Simple in-memory rate limiter.
 * For production, replace with Upstash Rate Limit or Redis-backed solution.
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

export function createRateLimiter(windowMs: number, maxRequests: number) {
    const store = new Map<string, RateLimitEntry>();

    // Periodically clean up expired entries to prevent memory leaks
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store) {
            if (now > entry.resetTime) {
                store.delete(key);
            }
        }
    }, windowMs * 2);

    return {
        /**
         * Returns true if the key is rate limited.
         */
        isLimited(key: string): boolean {
            const now = Date.now();
            const entry = store.get(key);

            if (!entry || now > entry.resetTime) {
                store.set(key, { count: 1, resetTime: now + windowMs });
                return false;
            }

            entry.count++;
            return entry.count > maxRequests;
        },
    };
}
