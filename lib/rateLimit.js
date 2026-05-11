/**
 * Simple in-memory rate limiter for auth endpoints.
 * In production, replace with Redis-backed rate limiting.
 */

const store = new Map();

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

/**
 * Check if a request should be rate-limited.
 * @param {string} identifier - IP address or unique client identifier
 * @param {number} [maxAttempts] - Override max requests for this endpoint
 * @returns {{ limited: boolean, remaining: number, resetAt: number }}
 */
export function checkRateLimit(identifier, maxAttempts = MAX_REQUESTS) {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || now > record.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, remaining: maxAttempts - 1, resetAt: now + WINDOW_MS };
  }

  record.count++;
  if (record.count > maxAttempts) {
    return { limited: true, remaining: 0, resetAt: record.resetAt };
  }

  return { limited: false, remaining: maxAttempts - record.count, resetAt: record.resetAt };
}

// Periodically clean up expired entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetAt) {
      store.delete(key);
    }
  }
}, 300000);
