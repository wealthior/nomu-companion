import { SIM_DEFAULTS } from "@/lib/constants";
import type { SimConfig, SimulationResult, TokenEvent } from "@/lib/types";

/**
 * Clamps a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Returns the UTC month string for a given timestamp.
 * @param timestampSec - Unix timestamp in seconds
 * @returns e.g. "2025-03"
 */
export function getSeasonId(timestampSec: number): string {
  const d = new Date(timestampSec * 1000);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Returns the start and end timestamps (in seconds) for a season.
 * @param seasonId - e.g. "2025-03"
 */
export function getSeasonBounds(seasonId: string): {
  start: number;
  end: number;
} {
  const [yearStr, monthStr] = seasonId.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const start = Date.UTC(year, month, 1) / 1000;
  const endDate = month === 11 ? Date.UTC(year + 1, 0, 1) : Date.UTC(year, month + 1, 1);
  return { start, end: endDate / 1000 };
}

/**
 * Groups events into seasons by UTC month.
 */
export function groupEventsBySeason(
  events: TokenEvent[]
): Map<string, TokenEvent[]> {
  const grouped = new Map<string, TokenEvent[]>();
  for (const event of events) {
    const seasonId = getSeasonId(event.timestamp);
    const existing = grouped.get(seasonId);
    if (existing) {
      existing.push(event);
    } else {
      grouped.set(seasonId, [event]);
    }
  }
  return grouped;
}

/**
 * Checks if buys qualify for DCA multiplier.
 * Buys must be spaced at least `minSpacingDays` apart.
 */
export function countQualifyingBuys(
  buyTimestamps: number[],
  minSpacingDays: number
): number {
  if (buyTimestamps.length === 0) return 0;

  const sorted = [...buyTimestamps].sort((a, b) => a - b);
  const spacingMs = minSpacingDays * 24 * 60 * 60;
  let count = 1;
  let lastTimestamp = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - lastTimestamp >= spacingMs) {
      count++;
      lastTimestamp = sorted[i];
    }
  }

  return count;
}

/**
 * Calculates the DCA multiplier based on buy pattern.
 */
export function getDcaMultiplier(
  buyTimestamps: number[],
  tiers: SimConfig["dcaTiers"]
): number {
  for (const tier of tiers) {
    const qualifying = countQualifyingBuys(
      buyTimestamps,
      tier.minSpacingDays
    );
    if (qualifying >= tier.minBuys) {
      return tier.multiplier;
    }
  }
  return 1.0;
}

/**
 * Checks if anti-dump rule is triggered.
 * Returns true if cumulative sell percentage exceeds threshold within window.
 */
export function checkAntiDump(
  events: TokenEvent[],
  threshold: number,
  windowMs: number
): boolean {
  const sells = events
    .filter((e) => e.type === "sell")
    .sort((a, b) => a.timestamp - b.timestamp);

  if (sells.length === 0) return false;

  const windowSec = windowMs / 1000;

  for (let i = 0; i < sells.length; i++) {
    const windowStart = sells[i].timestamp;
    const windowEnd = windowStart + windowSec;
    let cumulativeSoldPct = 0;
    let runningBalance = sells[i].postBalance + Math.abs(sells[i].deltaAmount);

    for (let j = i; j < sells.length && sells[j].timestamp <= windowEnd; j++) {
      const soldAmount = Math.abs(sells[j].deltaAmount);
      if (runningBalance > 0) {
        cumulativeSoldPct += soldAmount / runningBalance;
        runningBalance -= soldAmount;
      }
    }

    if (cumulativeSoldPct > threshold) {
      return true;
    }
  }

  return false;
}

/**
 * Simulates the value score for a single season.
 */
export function simulateSeason(
  events: TokenEvent[],
  config: SimConfig = SIM_DEFAULTS,
  startingBalance: number = 0
): SimulationResult {
  if (events.length === 0) {
    const now = Math.floor(Date.now() / 1000);
    const seasonId = getSeasonId(now);
    const bounds = getSeasonBounds(seasonId);
    return {
      seasonId,
      seasonStart: bounds.start,
      seasonEnd: bounds.end,
      rawScore: config.initialScore,
      dcaMultiplier: 1.0,
      finalScore: config.initialScore,
      finalBalance: startingBalance,
      weight: config.initialScore * startingBalance,
      disqualified: false,
      buyCount: 0,
      sellCount: 0,
      events: [],
    };
  }

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const seasonId = getSeasonId(sorted[0].timestamp);
  const bounds = getSeasonBounds(seasonId);

  let score = config.initialScore;
  let balance = startingBalance;
  const buyTimestamps: number[] = [];
  let buyCount = 0;
  let sellCount = 0;

  for (const event of sorted) {
    if (event.type === "buy") {
      score = score + (100 - score) * config.buyAlpha;
      balance += event.deltaAmount;
      buyTimestamps.push(event.timestamp);
      buyCount++;
    } else if (event.type === "sell") {
      const soldAmount = Math.abs(event.deltaAmount);
      const balanceBefore = balance;
      if (balanceBefore > 0) {
        const soldPct = soldAmount / balanceBefore;
        score = score * (1 - soldPct * config.sellBeta);
      }
      balance -= soldAmount;
      sellCount++;
    }
    // "unknown" events are treated neutrally
    score = clamp(score, 0, 100);
    balance = Math.max(balance, 0);
  }

  const disqualified = checkAntiDump(
    sorted,
    config.antiDumpThreshold,
    config.antiDumpWindowMs
  );

  if (disqualified) {
    score = 0;
  }

  const rawScore = score;
  const dcaMultiplier = getDcaMultiplier(buyTimestamps, config.dcaTiers);
  const finalScore = disqualified ? 0 : clamp(score * dcaMultiplier, 0, 100);
  const finalBalance = balance;
  const weight = finalScore * finalBalance;

  return {
    seasonId,
    seasonStart: bounds.start,
    seasonEnd: bounds.end,
    rawScore,
    dcaMultiplier,
    finalScore,
    finalBalance,
    weight,
    disqualified,
    buyCount,
    sellCount,
    events: sorted,
  };
}

/**
 * Simulates a "what-if" sell scenario on top of current simulation.
 * @param currentResult - Current simulation result
 * @param sellPercent - Percentage of balance to simulate selling (0-100)
 * @param config - Simulation config
 * @returns New simulation result after hypothetical sell
 */
export function simulateWhatIf(
  currentResult: SimulationResult,
  sellPercent: number,
  config: SimConfig = SIM_DEFAULTS
): SimulationResult {
  if (sellPercent <= 0 || currentResult.finalBalance <= 0) {
    return { ...currentResult };
  }

  const pct = clamp(sellPercent, 0, 100) / 100;
  const soldAmount = currentResult.finalBalance * pct;
  const balanceBefore = currentResult.finalBalance;
  const soldPct = soldAmount / balanceBefore;

  let newScore = currentResult.rawScore * (1 - soldPct * config.sellBeta);
  newScore = clamp(newScore, 0, 100);

  const newBalance = balanceBefore - soldAmount;

  // Check if this sell would trigger anti-dump
  const wouldDisqualify =
    currentResult.disqualified || pct > config.antiDumpThreshold;

  if (wouldDisqualify) {
    newScore = 0;
  }

  const finalScore = wouldDisqualify
    ? 0
    : clamp(newScore * currentResult.dcaMultiplier, 0, 100);

  return {
    ...currentResult,
    rawScore: newScore,
    finalScore,
    finalBalance: newBalance,
    weight: finalScore * newBalance,
    disqualified: wouldDisqualify,
  };
}
