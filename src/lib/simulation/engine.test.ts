import { describe, it, expect } from "vitest";
import {
  clamp,
  getSeasonId,
  getSeasonBounds,
  groupEventsBySeason,
  countQualifyingBuys,
  getDcaMultiplier,
  checkAntiDump,
  simulateSeason,
  simulateWhatIf,
} from "./engine";
import { SIM_DEFAULTS } from "@/lib/constants";
import type { TokenEvent, SimConfig } from "@/lib/types";

// Helper to create a token event
function makeEvent(
  overrides: Partial<TokenEvent> & { timestamp: number; deltaAmount: number }
): TokenEvent {
  const delta = overrides.deltaAmount;
  return {
    signature: overrides.signature ?? `sig_${Math.random().toString(36).slice(2, 10)}`,
    timestamp: overrides.timestamp,
    deltaAmount: delta,
    postBalance: overrides.postBalance ?? Math.max(0, delta),
    confidence: overrides.confidence ?? "high",
    type: overrides.type ?? (delta > 0 ? "buy" : delta < 0 ? "sell" : "unknown"),
  };
}

describe("clamp", () => {
  it("returns value within range", () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it("clamps to min", () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });

  it("clamps to max", () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it("handles equal min and max", () => {
    expect(clamp(50, 42, 42)).toBe(42);
  });
});

describe("getSeasonId", () => {
  it("returns correct season for Jan 2025", () => {
    // Jan 15, 2025 12:00 UTC
    const ts = Date.UTC(2025, 0, 15, 12) / 1000;
    expect(getSeasonId(ts)).toBe("2025-01");
  });

  it("returns correct season for Dec 2024", () => {
    const ts = Date.UTC(2024, 11, 31, 23, 59, 59) / 1000;
    expect(getSeasonId(ts)).toBe("2024-12");
  });

  it("returns correct season for first second of month", () => {
    const ts = Date.UTC(2025, 5, 1, 0, 0, 0) / 1000;
    expect(getSeasonId(ts)).toBe("2025-06");
  });
});

describe("getSeasonBounds", () => {
  it("returns correct bounds for March 2025", () => {
    const { start, end } = getSeasonBounds("2025-03");
    expect(start).toBe(Date.UTC(2025, 2, 1) / 1000);
    expect(end).toBe(Date.UTC(2025, 3, 1) / 1000);
  });

  it("handles December correctly (year boundary)", () => {
    const { start, end } = getSeasonBounds("2025-12");
    expect(start).toBe(Date.UTC(2025, 11, 1) / 1000);
    expect(end).toBe(Date.UTC(2026, 0, 1) / 1000);
  });

  it("handles January correctly", () => {
    const { start, end } = getSeasonBounds("2025-01");
    expect(start).toBe(Date.UTC(2025, 0, 1) / 1000);
    expect(end).toBe(Date.UTC(2025, 1, 1) / 1000);
  });
});

describe("groupEventsBySeason", () => {
  it("groups events by their UTC month", () => {
    const events: TokenEvent[] = [
      makeEvent({ timestamp: Date.UTC(2025, 0, 10) / 1000, deltaAmount: 100 }),
      makeEvent({ timestamp: Date.UTC(2025, 0, 20) / 1000, deltaAmount: 200 }),
      makeEvent({ timestamp: Date.UTC(2025, 1, 5) / 1000, deltaAmount: 300 }),
    ];
    const grouped = groupEventsBySeason(events);
    expect(grouped.size).toBe(2);
    expect(grouped.get("2025-01")?.length).toBe(2);
    expect(grouped.get("2025-02")?.length).toBe(1);
  });

  it("returns empty map for no events", () => {
    expect(groupEventsBySeason([]).size).toBe(0);
  });
});

describe("countQualifyingBuys", () => {
  it("counts buys spaced at least minSpacingDays apart", () => {
    const day = 86400;
    const timestamps = [0, 5 * day, 10 * day, 15 * day];
    expect(countQualifyingBuys(timestamps, 5)).toBe(4);
  });

  it("skips buys too close together", () => {
    const day = 86400;
    const timestamps = [0, 1 * day, 2 * day, 10 * day];
    expect(countQualifyingBuys(timestamps, 5)).toBe(2);
  });

  it("returns 0 for empty array", () => {
    expect(countQualifyingBuys([], 5)).toBe(0);
  });

  it("returns 1 for single buy", () => {
    expect(countQualifyingBuys([1000], 5)).toBe(1);
  });
});

describe("getDcaMultiplier", () => {
  it("returns 1.0 for no buys", () => {
    expect(getDcaMultiplier([], SIM_DEFAULTS.dcaTiers)).toBe(1.0);
  });

  it("returns 1.05 for 3 qualifying buys", () => {
    const day = 86400;
    const timestamps = [0, 5 * day, 10 * day];
    expect(getDcaMultiplier(timestamps, SIM_DEFAULTS.dcaTiers)).toBe(1.05);
  });

  it("returns 1.10 for 6 qualifying buys", () => {
    const day = 86400;
    const timestamps = Array.from({ length: 6 }, (_, i) => i * 5 * day);
    expect(getDcaMultiplier(timestamps, SIM_DEFAULTS.dcaTiers)).toBe(1.1);
  });

  it("returns 1.20 for 10 qualifying buys", () => {
    const day = 86400;
    const timestamps = Array.from({ length: 10 }, (_, i) => i * 5 * day);
    expect(getDcaMultiplier(timestamps, SIM_DEFAULTS.dcaTiers)).toBe(1.2);
  });

  it("returns 1.0 for buys that are too close together", () => {
    const timestamps = [0, 100, 200]; // all within seconds
    expect(getDcaMultiplier(timestamps, SIM_DEFAULTS.dcaTiers)).toBe(1.0);
  });
});

describe("checkAntiDump", () => {
  it("returns false for no sells", () => {
    const events = [
      makeEvent({ timestamp: 1000, deltaAmount: 100 }),
    ];
    expect(checkAntiDump(events, 0.6, 86400000)).toBe(false);
  });

  it("returns false for small sell", () => {
    const events = [
      makeEvent({
        timestamp: 1000,
        deltaAmount: -10,
        postBalance: 90,
        type: "sell",
      }),
    ];
    expect(checkAntiDump(events, 0.6, 86400000)).toBe(false);
  });

  it("returns true for massive dump", () => {
    const events = [
      makeEvent({
        timestamp: 1000,
        deltaAmount: -80,
        postBalance: 20,
        type: "sell",
      }),
    ];
    // 80/100 = 0.8 > 0.6
    expect(checkAntiDump(events, 0.6, 86400000)).toBe(true);
  });

  it("returns true for cumulative sells within window", () => {
    const events = [
      makeEvent({
        timestamp: 1000,
        deltaAmount: -40,
        postBalance: 60,
        type: "sell",
      }),
      makeEvent({
        timestamp: 2000,
        deltaAmount: -30,
        postBalance: 30,
        type: "sell",
      }),
    ];
    // First sell: 40/100 = 0.4, then 30/60 = 0.5, cumulative > 0.6
    expect(checkAntiDump(events, 0.6, 86400000)).toBe(true);
  });
});

describe("simulateSeason", () => {
  const config: SimConfig = { ...SIM_DEFAULTS };

  it("returns default for no events", () => {
    const result = simulateSeason([], config, 1000);
    expect(result.rawScore).toBe(50);
    expect(result.finalBalance).toBe(1000);
    expect(result.weight).toBe(50 * 1000);
    expect(result.disqualified).toBe(false);
  });

  it("increases score on buy", () => {
    const events = [
      makeEvent({ timestamp: Date.UTC(2025, 2, 5) / 1000, deltaAmount: 100 }),
    ];
    const result = simulateSeason(events, config, 0);
    // score = 50 + (100 - 50) * 0.03 = 50 + 1.5 = 51.5
    expect(result.rawScore).toBeCloseTo(51.5, 1);
    expect(result.finalBalance).toBe(100);
    expect(result.buyCount).toBe(1);
  });

  it("decreases score on sell", () => {
    const events = [
      makeEvent({ timestamp: Date.UTC(2025, 2, 5) / 1000, deltaAmount: 100, postBalance: 100, type: "buy" }),
      makeEvent({ timestamp: Date.UTC(2025, 2, 10) / 1000, deltaAmount: -50, postBalance: 50, type: "sell" }),
    ];
    const result = simulateSeason(events, config, 0);
    // After buy: score = 50 + (100-50)*0.03 = 51.5, balance = 100
    // After sell: soldPct = 50/100 = 0.5, score = 51.5 * (1 - 0.5*1.5) = 51.5 * 0.25 = 12.875
    expect(result.rawScore).toBeCloseTo(12.875, 1);
    expect(result.finalBalance).toBe(50);
    expect(result.sellCount).toBe(1);
  });

  it("sets score to 0 on anti-dump", () => {
    const events = [
      makeEvent({ timestamp: Date.UTC(2025, 2, 5) / 1000, deltaAmount: 1000, type: "buy" }),
      makeEvent({ timestamp: Date.UTC(2025, 2, 5, 1) / 1000, deltaAmount: -800, postBalance: 200, type: "sell" }),
    ];
    const result = simulateSeason(events, config, 0);
    expect(result.disqualified).toBe(true);
    expect(result.finalScore).toBe(0);
    expect(result.weight).toBe(0);
  });

  it("treats unknown events neutrally", () => {
    const events = [
      makeEvent({ timestamp: Date.UTC(2025, 2, 5) / 1000, deltaAmount: 0, type: "unknown" }),
    ];
    const result = simulateSeason(events, config, 500);
    expect(result.rawScore).toBe(50);
    expect(result.finalBalance).toBe(500);
  });

  it("applies DCA multiplier correctly", () => {
    const day = 86400;
    const base = Date.UTC(2025, 2, 1) / 1000;
    const events = Array.from({ length: 3 }, (_, i) =>
      makeEvent({
        timestamp: base + i * 6 * day,
        deltaAmount: 100,
        type: "buy",
      })
    );
    const result = simulateSeason(events, config, 0);
    expect(result.dcaMultiplier).toBe(1.05);
    expect(result.finalScore).toBeGreaterThan(result.rawScore);
  });
});

describe("simulateWhatIf", () => {
  it("returns same result for 0% sell", () => {
    const base = simulateSeason([], SIM_DEFAULTS, 1000);
    const whatIf = simulateWhatIf(base, 0);
    expect(whatIf.finalScore).toBe(base.finalScore);
    expect(whatIf.weight).toBe(base.weight);
  });

  it("reduces score and balance on sell", () => {
    const base = simulateSeason([], SIM_DEFAULTS, 1000);
    const whatIf = simulateWhatIf(base, 50);
    expect(whatIf.finalBalance).toBe(500);
    expect(whatIf.finalScore).toBeLessThan(base.finalScore);
    expect(whatIf.weight).toBeLessThan(base.weight);
  });

  it("triggers anti-dump for large sell", () => {
    const base = simulateSeason([], SIM_DEFAULTS, 1000);
    const whatIf = simulateWhatIf(base, 80);
    expect(whatIf.disqualified).toBe(true);
    expect(whatIf.finalScore).toBe(0);
    expect(whatIf.weight).toBe(0);
  });

  it("clamps sellPercent to 0-100", () => {
    const base = simulateSeason([], SIM_DEFAULTS, 1000);
    const whatIf = simulateWhatIf(base, 150);
    expect(whatIf.finalBalance).toBe(0);
  });
});
