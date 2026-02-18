/** Represents a token transaction event relevant to the simulation */
export interface TokenEvent {
  /** Transaction signature */
  signature: string;
  /** Unix timestamp in seconds */
  timestamp: number;
  /** Positive = buy, negative = sell */
  deltaAmount: number;
  /** Balance after this transaction */
  postBalance: number;
  /** Confidence in buy/sell classification */
  confidence: "high" | "medium" | "low" | "unknown";
  /** Detected event type */
  type: "buy" | "sell" | "unknown";
}

/** Simulation result for a single season */
export interface SimulationResult {
  /** UTC month string, e.g. "2025-03" */
  seasonId: string;
  /** Season start timestamp */
  seasonStart: number;
  /** Season end timestamp */
  seasonEnd: number;
  /** Raw score before DCA multiplier */
  rawScore: number;
  /** DCA multiplier applied */
  dcaMultiplier: number;
  /** Final score after multiplier, clamped 0-100 */
  finalScore: number;
  /** Token balance at end of season */
  finalBalance: number;
  /** weight = finalScore * finalBalance */
  weight: number;
  /** Whether the anti-dump rule was triggered */
  disqualified: boolean;
  /** Number of buy events in season */
  buyCount: number;
  /** Number of sell events in season */
  sellCount: number;
  /** Events processed in this season */
  events: TokenEvent[];
}

/** What-if simulation parameters */
export interface WhatIfParams {
  /** Percentage of current balance to simulate selling (0-100) */
  sellPercent: number;
}

/** Simulation engine configuration */
export interface SimConfig {
  buyAlpha: number;
  sellBeta: number;
  initialScore: number;
  antiDumpThreshold: number;
  antiDumpWindowMs: number;
  dcaTiers: ReadonlyArray<{
    minBuys: number;
    minSpacingDays: number;
    multiplier: number;
  }>;
}

/** Leaderboard entry as returned by the API */
export interface LeaderboardEntryDTO {
  rank: number;
  wallet: string;
  balance: number;
  simulatedScore: number;
  simulatedWeight: number;
  ogFlag: boolean;
  displayName: string | null;
  updatedAt: string;
}

/** OG NFT info (includes last activity data inline to avoid extra RPC calls) */
export interface OgNftInfo {
  mint: string;
  name: string;
  image: string;
  /** Whether the wallet currently holds this NFT (false = previously held, now sold/transferred) */
  held: boolean;
  /** Unix timestamp of the most recent activity (acquisition or disposal), null if unknown */
  lastActivityTs: number | null;
  /** Transaction signature of the most recent activity, null if unknown */
  lastActivitySig: string | null;
}

/** Represents an NFT acquisition or disposal event (derived from OgNftInfo) */
export interface NftEvent {
  /** Transaction signature */
  signature: string;
  /** Unix timestamp in seconds */
  timestamp: number;
  /** NFT mint address */
  mint: string;
  /** NFT display name (e.g. "Nomu OG #42") */
  name: string;
  /** NFT image URL (resolved) */
  image: string;
  /** Event type: acquired = wallet received the NFT, disposed = wallet sent it away */
  type: "acquired" | "disposed";
}

/** Wallet profile data */
export interface WalletProfile {
  wallet: string;
  balance: number;
  simulation: SimulationResult | null;
  ogNfts: OgNftInfo[];
  nftEvents: NftEvent[];
  optedIn: boolean;
  leaderboardRank: number | null;
}

/** Data adapter interface for fetching on-chain data */
export interface DataAdapter {
  /** Fetch current NOMU token balance for a wallet */
  getBalance(wallet: string): Promise<number>;
  /** Fetch token transaction history for simulation */
  getTokenEvents(
    wallet: string,
    startTime?: number,
    endTime?: number
  ): Promise<TokenEvent[]>;
  /**
   * Fetch OG NFTs with inline activity data.
   * Returns all known Nomu OG NFTs (held and sold) with their last activity timestamps.
   */
  getOgNfts(wallet: string): Promise<OgNftInfo[]>;
}
