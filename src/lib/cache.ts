interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Simple in-memory cache with TTL.
 * @param key - Cache key
 * @param ttlMs - Time to live in milliseconds
 * @param fetcher - Function to fetch data on cache miss
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    return existing.data as T;
  }

  const data = await fetcher();
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
}

/**
 * Invalidates a specific cache entry.
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Clears all cache entries.
 */
export function clearCache(): void {
  cache.clear();
}

/** Cache TTL constants */
export const CACHE_TTL = {
  /** Balance: 30 seconds */
  balance: 30_000,
  /** Token events: 2 minutes */
  events: 120_000,
  /** OG NFT check: 10 minutes */
  ogNfts: 600_000,
  /** NFT events: 10 minutes */
  nftEvents: 600_000,
  /** Simulation result: 1 minute */
  simulation: 60_000,
  /** Leaderboard: 5 minutes */
  leaderboard: 300_000,
} as const;
