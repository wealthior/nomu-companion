/** $NOMU SPL token mint address on Solana mainnet */
export const NOMU_MINT = "NomuBwKJEvJ8d4dsaq7NZoHaXWXzKcfke1c7Y8ruFYL";

/**
 * Known Nomu OG NFT mint addresses.
 * Add individual mint addresses here for direct matching,
 * or the RPC adapter will also do name-based detection via on-chain metadata.
 */
export const NOMU_OG_NFT_COLLECTION_NAME = "nomu";

/**
 * NFT name patterns to EXCLUDE from OG detection.
 * E.g. "NOMU Liquidity Provider" NFTs are not OG NFTs.
 */
export const NOMU_NFT_EXCLUDE_PATTERNS = [
  "liquidity provider",
  "liquidity pool",
  "lp token",
] as const;

/** TGE month — the first season of NOMU invisible staking */
export const TGE_SEASON_ID = "2025-11";

/** Default simulation parameters (configurable) */
export const SIM_DEFAULTS = {
  /** How much a buy moves score toward 100 */
  buyAlpha: 0.03,
  /** Penalty multiplier on sell (applied to soldPct) */
  sellBeta: 1.5,
  /** Initial value score at season start */
  initialScore: 50,
  /** Anti-dump threshold: cumulative sell % in 24h window */
  antiDumpThreshold: 0.6,
  /** Anti-dump window in milliseconds (24 hours) */
  antiDumpWindowMs: 24 * 60 * 60 * 1000,
  /** DCA multiplier tiers: [minBuys, multiplier] */
  dcaTiers: [
    { minBuys: 10, minSpacingDays: 5, multiplier: 1.2 },
    { minBuys: 6, minSpacingDays: 5, multiplier: 1.1 },
    { minBuys: 3, minSpacingDays: 5, multiplier: 1.05 },
  ] as const,
} as const;

/** Season duration: 1 calendar month */
export const SEASON_DURATION_LABEL = "1 month (calendar)";

/** Rate limiting */
export const API_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 30,
} as const;

/** Leaderboard config */
export const LEADERBOARD_PAGE_SIZE = 100;

/** Opt-in sign message prefix */
export const OPT_IN_MESSAGE_PREFIX = "Nomu Staking Companion Opt In";
