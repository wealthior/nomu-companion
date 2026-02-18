import { API_RATE_LIMIT } from "@/lib/constants";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limiter = new Map<string, RateLimitEntry>();

/**
 * Simple in-memory rate limiter.
 * @param key - Rate limit key (e.g., IP or wallet address)
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(key: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  const entry = limiter.get(key);

  if (!entry || entry.resetAt <= now) {
    limiter.set(key, {
      count: 1,
      resetAt: now + API_RATE_LIMIT.windowMs,
    });
    return {
      allowed: true,
      remaining: API_RATE_LIMIT.maxRequests - 1,
      resetIn: API_RATE_LIMIT.windowMs,
    };
  }

  if (entry.count >= API_RATE_LIMIT.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetAt - now,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: API_RATE_LIMIT.maxRequests - entry.count,
    resetIn: entry.resetAt - now,
  };
}

/**
 * Creates a rate-limited NextResponse or null if allowed.
 */
export function rateLimitResponse(key: string): Response | null {
  const result = checkRateLimit(key);
  if (!result.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests", resetIn: result.resetIn }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(result.resetIn / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }
  return null;
}
