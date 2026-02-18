"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { WalletProfile, SimulationResult } from "@/lib/types";
import { simulateWhatIf } from "@/lib/simulation";
import { SIM_DEFAULTS } from "@/lib/constants";

/**
 * Fires a background POST to fill missing NFT activity timestamps.
 * On success, triggers a silent refetch so the dashboard updates.
 * Deduplicates: only one fill per wallet at a time.
 */
const fillInProgress = new Set<string>();

function triggerNftActivityFill(
  wallet: string,
  missingCount: number,
  onComplete: () => void
): void {
  if (fillInProgress.has(wallet)) return;
  fillInProgress.add(wallet);

  console.log(
    `[useWalletData] ${missingCount} NFTs missing activity, triggering background fill...`
  );

  fetch(`/api/wallet/${wallet}/nft-activity`, { method: "POST" })
    .then((res) => res.json())
    .then((result: { filled?: number }) => {
      if (result.filled && result.filled > 0) {
        console.log(
          `[useWalletData] Background fill discovered ${result.filled} new timestamps, refreshing...`
        );
        onComplete();
      }
    })
    .catch(() => {
      // Silently ignore — best effort
    })
    .finally(() => {
      fillInProgress.delete(wallet);
    });
}

interface UseWalletDataReturn {
  profile: WalletProfile | null;
  whatIf: SimulationResult | null;
  loading: boolean;
  error: string | null;
  seasonId: string | null;
  refetch: () => void;
  simulateSell: (sellPercent: number) => void;
  switchSeason: (seasonId: string) => void;
}

/**
 * Hook to fetch wallet profile data and run what-if simulations.
 * What-if simulation runs entirely on the client for instant feedback.
 * Supports switching between historical seasons.
 */
export function useWalletData(wallet: string | null): UseWalletDataReturn {
  const [profile, setProfile] = useState<WalletProfile | null>(null);
  const [sellPercent, setSellPercent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!wallet) {
      setProfile(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const seasonParam = seasonId ? `?season=${seasonId}` : "";
      const res = await fetch(`/api/wallet/${wallet}${seasonParam}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to fetch wallet data");
      }
      const data: WalletProfile = await res.json();
      setProfile(data);

      // If some NFTs are missing activity timestamps, trigger background fill
      if (data.ogNfts.length > 0) {
        const missingCount = data.ogNfts.filter((n) => !n.lastActivityTs).length;
        if (missingCount > 0) {
          triggerNftActivityFill(wallet, missingCount, () => fetchProfile());
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [wallet, seasonId]);

  /**
   * Compute what-if result locally using useMemo for instant updates.
   * No API call needed — the simulation engine runs fully on the client.
   */
  const whatIf = useMemo(() => {
    if (!profile?.simulation || sellPercent <= 0) return null;
    return simulateWhatIf(profile.simulation, sellPercent, SIM_DEFAULTS);
  }, [profile?.simulation, sellPercent]);

  const simulateSell = useCallback((percent: number) => {
    setSellPercent(percent);
  }, []);

  const switchSeason = useCallback((newSeasonId: string) => {
    setSellPercent(0); // Reset what-if when switching seasons
    setSeasonId(newSeasonId);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    whatIf,
    loading,
    error,
    seasonId,
    refetch: fetchProfile,
    simulateSell,
    switchSeason,
  };
}
