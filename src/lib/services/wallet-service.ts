import { getDataAdapter } from "@/lib/solana/adapter";
import { simulateSeason, getSeasonBounds } from "@/lib/simulation";
import { getCurrentSeasonId } from "@/lib/simulation/season";
import { cached, invalidateCache, CACHE_TTL } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { loadNftActivity, saveNftActivity, mergeNftActivity } from "@/lib/services/nft-activity-store";
import { discoverSoldNfts } from "@/lib/services/nft-sold-discovery";
import type { SimulationResult, TokenEvent, OgNftInfo, NftEvent, WalletProfile } from "@/lib/types";

/**
 * Derives NftEvent[] from OgNftInfo[] using inline activity data.
 * No extra RPC calls needed — activity timestamps are embedded in getOgNfts.
 * @param ogNfts - OG NFTs with inline lastActivityTs/lastActivitySig
 */
function deriveNftEvents(ogNfts: OgNftInfo[]): NftEvent[] {
  return ogNfts
    .filter((n) => n.lastActivityTs != null && n.lastActivitySig != null)
    .map((n) => ({
      signature: n.lastActivitySig!,
      timestamp: n.lastActivityTs!,
      mint: n.mint,
      name: n.name,
      image: n.image,
      type: n.held ? ("acquired" as const) : ("disposed" as const),
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
}
import { SIM_DEFAULTS } from "@/lib/constants";

/** Small delay helper to space out RPC-heavy steps */
function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches the current NOMU balance for a wallet.
 */
export async function getWalletBalance(wallet: string): Promise<number> {
  return cached(`balance:${wallet}`, CACHE_TTL.balance, () =>
    getDataAdapter().getBalance(wallet)
  );
}

/**
 * Fetches token events for a given season.
 * Throws on RPC failure so that errors are NOT cached as empty arrays.
 * @param wallet - Wallet address
 * @param seasonId - Optional season ID (e.g. "2025-11"). Defaults to current season.
 */
export async function getWalletEvents(
  wallet: string,
  seasonId?: string
): Promise<TokenEvent[]> {
  const sid = seasonId ?? getCurrentSeasonId();
  const { start, end } = getSeasonBounds(sid);
  return cached(`events:${wallet}:${sid}`, CACHE_TTL.events, () =>
    getDataAdapter().getTokenEvents(wallet, start, end)
  );
}

/**
 * Builds a default simulation result when no events are available.
 * @param balance - Current token balance
 * @param seasonId - Optional season ID. Defaults to current season.
 */
function buildDefaultSimulation(balance: number, seasonId?: string): SimulationResult {
  const sid = seasonId ?? getCurrentSeasonId();
  const { start, end } = getSeasonBounds(sid);
  return {
    seasonId: sid,
    seasonStart: start,
    seasonEnd: end,
    rawScore: SIM_DEFAULTS.initialScore,
    dcaMultiplier: 1.0,
    finalScore: SIM_DEFAULTS.initialScore,
    finalBalance: balance,
    weight: SIM_DEFAULTS.initialScore * balance,
    disqualified: false,
    buyCount: 0,
    sellCount: 0,
    events: [],
  };
}

/**
 * Runs the simulation for a wallet in a given season.
 * Falls back to default score (50) if events cannot be fetched.
 * Errors from event fetching are NOT cached — only successful results are cached.
 * @param wallet - Wallet address
 * @param seasonId - Optional season ID (e.g. "2025-11"). Defaults to current season.
 */
export async function getWalletSimulation(
  wallet: string,
  seasonId?: string
): Promise<SimulationResult> {
  const sid = seasonId ?? getCurrentSeasonId();
  return cached(`sim:${wallet}:${sid}`, CACHE_TTL.simulation, async () => {
    // Fetch balance first (1 RPC call)
    const balance = await getWalletBalance(wallet);

    // Fetch events — throws on RPC error (won't cache empty result)
    const events = await getWalletEvents(wallet, sid);

    if (events.length === 0) {
      return buildDefaultSimulation(balance, sid);
    }

    // Calculate starting balance from the first event:
    // postBalance - deltaAmount = the balance BEFORE that event occurred.
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
    const firstEvent = sorted[0];
    const startingBalance = firstEvent.postBalance - firstEvent.deltaAmount;

    return simulateSeason(events, SIM_DEFAULTS, startingBalance);
  });
}

/**
 * Fetches OG NFT info for a wallet with persistent DB caching and sold NFT discovery.
 * Returns empty array on failure (graceful degradation).
 *
 * Strategy:
 * 1. Load cached activity timestamps from DB (instant, no RPC)
 * 2. Fetch fresh NFT data from RPC adapter (may have incomplete timestamps)
 * 3. Merge: DB-cached timestamps fill gaps where RPC got 429'd
 * 4. Discover sold NFTs via Magic Eden API (HTTP, no RPC budget consumed)
 *    - Sold NFTs have closed token accounts, invisible to RPC
 *    - Magic Eden records all marketplace activity
 * 5. Persist all data back to DB
 *
 * Result: First request discovers held NFTs + sold NFTs. Timestamps fill in
 * progressively via DB caching and background fill.
 */
export async function getWalletOgNfts(wallet: string): Promise<OgNftInfo[]> {
  return cached(`og:${wallet}`, CACHE_TTL.ogNfts, async () => {
    try {
      // Step 1: Load previously discovered activity from DB (fast, no RPC)
      const dbCache = await loadNftActivity(wallet).catch(() => {
        console.warn(`[wallet-service] Failed to load NFT activity from DB`);
        return new Map() as Awaited<ReturnType<typeof loadNftActivity>>;
      });

      // Step 2: Fetch fresh NFT data from RPC (may have partial timestamps)
      const rpcNfts = await getDataAdapter().getOgNfts(wallet);

      // Step 3: Merge — DB fills gaps where RPC got rate-limited + resurrects known sold NFTs
      const merged = mergeNftActivity(rpcNfts.length > 0 ? rpcNfts : [], dbCache);

      // Step 4: Discover sold NFTs via Magic Eden API (HTTP, not RPC)
      // Only run if we haven't already found sold NFTs from DB cache
      const hasSoldFromDb = merged.some((n) => !n.held);
      if (!hasSoldFromDb) {
        const knownMints = new Set(merged.map((n) => n.mint));
        const soldNfts = await discoverSoldNfts(wallet, knownMints);
        if (soldNfts.length > 0) {
          merged.push(...soldNfts);
        }
      }

      if (merged.length === 0) return [];

      // Step 5: Persist all data back to DB (fire-and-forget)
      saveNftActivity(wallet, merged).catch((err) =>
        console.warn(
          `[wallet-service] Failed to save NFT activity to DB:`,
          err instanceof Error ? err.message : err
        )
      );

      // Check completeness for cache invalidation
      const withActivity = merged.filter((n) => n.lastActivityTs != null).length;
      const isComplete = withActivity === merged.length;

      if (!isComplete) {
        console.log(
          `[wallet-service] OG NFTs: ${withActivity}/${merged.length} have activity data (DB+RPC merged), short cache`
        );
        // Invalidate after 15s so next request retries the missing ones
        setTimeout(() => invalidateCache(`og:${wallet}`), 15_000);
      } else {
        console.log(
          `[wallet-service] All ${merged.length} OG NFTs have activity data (DB+RPC merged)`
        );
      }

      return merged;
    } catch (err) {
      console.warn(
        `[wallet-service] Failed to fetch OG NFTs for ${wallet.slice(0, 8)}...:`,
        err instanceof Error ? err.message : err
      );
      return [];
    }
  });
}


/**
 * Builds a complete wallet profile.
 *
 * RPC calls are sequenced to stay under the public Solana RPC rate limit (~10 req/s).
 * DB calls (leaderboard) run in parallel since they don't touch the RPC.
 * Each adapter method has its own caching + retry logic.
 *
 * @param wallet - Wallet address
 * @param seasonId - Optional season ID (e.g. "2025-11"). Defaults to current season.
 */
export async function getWalletProfile(
  wallet: string,
  seasonId?: string
): Promise<WalletProfile> {
  // Start leaderboard DB query early (no RPC, won't conflict)
  const leaderboardPromise = prisma.leaderboardEntry
    .findUnique({ where: { wallet } })
    .catch(() => null);

  // Step 1: Simulation (internally fetches balance + events — ~5 RPC calls)
  const simulation = await getWalletSimulation(wallet, seasonId).catch(
    (err): SimulationResult => {
      console.warn(
        `[wallet-service] Simulation failed for ${wallet.slice(0, 8)}..., using defaults:`,
        err instanceof Error ? err.message : err
      );
      return buildDefaultSimulation(0, seasonId);
    }
  );

  // Step 2: Balance (likely cached from simulation step)
  const balance = await getWalletBalance(wallet);

  // Breathing room before NFT calls (RPC needs recovery after event parsing)
  await pause(500);

  // Step 3: OG NFTs with inline activity data (~5 RPC calls + 1 per NFT for signatures)
  const ogNfts = await getWalletOgNfts(wallet);

  // Derive NFT events from inline activity data (no extra RPC calls)
  const nftEvents = deriveNftEvents(ogNfts);

  // Await leaderboard (should be long done by now)
  const leaderboardEntry = await leaderboardPromise;

  let leaderboardRank: number | null = null;
  if (leaderboardEntry) {
    const rank = await prisma.leaderboardEntry
      .count({
        where: { simulatedWeight: { gt: leaderboardEntry.simulatedWeight } },
      })
      .catch(() => 0);
    leaderboardRank = rank + 1;
  }

  return {
    wallet,
    balance,
    simulation,
    ogNfts,
    nftEvents,
    optedIn: !!leaderboardEntry,
    leaderboardRank,
  };
}
