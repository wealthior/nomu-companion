"use client";

import { useWalletData } from "@/hooks/use-wallet-data";
import { StatCard } from "./stat-card";
import { ScoreGauge } from "./score-gauge";
import { WhatIfSlider } from "./what-if-slider";
import { EventsList } from "./events-list";
import { NftEventsList } from "./nft-events-list";
import { OptInButton } from "./opt-in-button";
import { SeasonSelector } from "./season-selector";
import {
  formatSeasonId,
  getCurrentSeasonId,
  getSeasonProgressById,
} from "@/lib/simulation/season";
import Link from "next/link";

interface DashboardContentProps {
  walletAddress: string;
}

export function DashboardContent({ walletAddress }: DashboardContentProps) {
  const {
    profile,
    whatIf,
    loading,
    error,
    seasonId: selectedSeasonId,
    refetch,
    simulateSell,
    switchSeason,
  } = useWalletData(walletAddress);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-nomu-500/30 border-t-nomu-500" />
          <span className="absolute inset-0 flex items-center justify-center text-lg animate-pulse-glow">
            🐠
          </span>
        </div>
        <p className="mt-6 text-sm text-dark-muted">Diving into the blockchain...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="text-4xl mb-4">🌊</span>
        <p className="text-sm text-red-400 mb-4">{error}</p>
        <button onClick={refetch} className="btn-secondary text-xs">
          Try Again
        </button>
      </div>
    );
  }

  if (!profile) return null;

  const sim = profile.simulation;
  const displaySeasonId =
    sim?.seasonId ?? selectedSeasonId ?? getCurrentSeasonId();
  const currentSeasonId = getCurrentSeasonId();
  const isCurrentSeason = displaySeasonId === currentSeasonId;
  const progress = getSeasonProgressById(displaySeasonId);
  const nftCount = profile.ogNfts.length;
  const heldNftCount = profile.ogNfts.filter((n) => n.held).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <span>🐠</span>
            Dashboard
          </h1>
          <p className="text-xs font-mono text-dark-muted mt-1">
            {walletAddress}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {nftCount > 0 && (
            <span className="badge-og">
              🐟 OG Holder &middot; {heldNftCount} NFT{heldNftCount !== 1 ? "s" : ""}
              {heldNftCount < nftCount && ` (${nftCount - heldNftCount} sold)`}
            </span>
          )}
          <OptInButton isOptedIn={profile.optedIn} onOptIn={refetch} />
          <Link
            href={`/u/${walletAddress}`}
            className="btn-secondary text-xs"
          >
            Public Profile
          </Link>
        </div>
      </div>

      {/* Season info with selector */}
      <div className="card relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nomu-500/30 to-transparent" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold">
              {formatSeasonId(displaySeasonId)}
            </span>
            {!isCurrentSeason && (
              <span className="rounded-full bg-ocean-500/10 border border-ocean-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-ocean-400">
                Past Season
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <SeasonSelector
              currentSeasonId={selectedSeasonId}
              onSeasonChange={switchSeason}
            />
            <span className="text-xs text-dark-muted font-mono whitespace-nowrap">
              {progress.toFixed(0)}%{isCurrentSeason ? " complete" : ""}
            </span>
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-dark-surface overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #f97316 0%, #fb923c 40%, #36bfff 100%)",
            }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="$NOMU Balance"
          value={profile.balance.toLocaleString("en-US", {
            maximumFractionDigits: 0,
          })}
          subValue="Current wallet balance"
          icon="💰"
        />
        <StatCard
          label="Value Score"
          value={sim?.finalScore.toFixed(1) ?? "50.0"}
          accent
          subValue={
            sim && sim.dcaMultiplier > 1
              ? `DCA ${sim.dcaMultiplier}x bonus!`
              : "Higher = more rewards"
          }
          icon="🎯"
        />
        <StatCard
          label="Reward Weight"
          value={
            sim?.weight.toLocaleString("en-US", {
              maximumFractionDigits: 0,
            }) ?? "0"
          }
          subValue="Score × Balance"
          icon="⚡"
        />
        <StatCard
          label="Leaderboard"
          value={
            profile.leaderboardRank
              ? `#${profile.leaderboardRank}`
              : "Not opted in"
          }
          subValue={profile.optedIn ? "Opt-in active" : "Sign to join"}
          icon="🏆"
        />
      </div>

      {/* How it works explainer */}
      <div className="card relative overflow-hidden border-nomu-500/15">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nomu-500/40 to-transparent" />
        <h3 className="text-sm font-bold text-nomu-400 mb-2 flex items-center gap-2">
          <span>🐟</span>
          How does Invisible Staking work?
        </h3>
        <p className="text-xs text-dark-muted leading-relaxed">
          $NOMU redistributes 10% of trading fees each season based on your{" "}
          <span className="text-nomu-400 font-semibold">Reward Weight</span>{" "}
          (Score &times; Balance). Your{" "}
          <span className="text-ocean-400 font-semibold">Value Score</span>{" "}
          starts at 50 &mdash; buys push it up, sells drag it down. DCA buying earns a multiplier.
          Dumping &gt;60% in 24h = disqualified. Just hold &amp; stack to maximize your share.
        </p>
      </div>

      {/* Score gauge + What-if */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card flex flex-col items-center justify-center py-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ocean-500/20 to-transparent" />
          <ScoreGauge score={sim?.finalScore ?? 50} size="lg" />
          <div className="mt-6 grid grid-cols-3 gap-6 text-center w-full">
            <div>
              <p className="stat-label">Raw Score</p>
              <p className="text-sm font-bold mt-1 text-dark-text">
                {sim?.rawScore.toFixed(1) ?? "50.0"}
              </p>
            </div>
            <div>
              <p className="stat-label">DCA Bonus</p>
              <p className="text-sm font-bold mt-1 text-nomu-400">
                {sim?.dcaMultiplier.toFixed(2) ?? "1.00"}x
              </p>
            </div>
            <div>
              <p className="stat-label">Status</p>
              <p
                className={`text-sm font-bold mt-1 ${sim?.disqualified ? "text-red-400" : "text-emerald-400"}`}
              >
                {sim?.disqualified ? "REKT" : "Active"}
              </p>
            </div>
          </div>
        </div>

        {sim && (
          <WhatIfSlider
            currentSimulation={sim}
            whatIfResult={whatIf}
            onSimulate={simulateSell}
          />
        )}
      </div>

      {/* Season activity summary */}
      {sim && (
        <div className="card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ocean-500/20 to-transparent" />
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <span>📊</span>
              Season Activity
            </h3>
            <span className="text-xs text-dark-muted font-mono">
              {formatSeasonId(displaySeasonId)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-dark-surface/50 border border-emerald-500/10 p-4 text-center transition-all duration-300 hover:border-emerald-500/25">
              <p className="stat-label">Buys</p>
              <p className="mt-2 text-2xl font-black text-emerald-400">
                {sim.buyCount}
              </p>
            </div>
            <div className="rounded-xl bg-dark-surface/50 border border-red-500/10 p-4 text-center transition-all duration-300 hover:border-red-500/25">
              <p className="stat-label">Sells</p>
              <p className="mt-2 text-2xl font-black text-red-400">
                {sim.sellCount}
              </p>
            </div>
            <div className="rounded-xl bg-dark-surface/50 border border-dark-border/50 p-4 text-center transition-all duration-300 hover:border-ocean-500/25">
              <p className="stat-label">Total Txns</p>
              <p className="mt-2 text-2xl font-black text-ocean-400">
                {sim.events.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* OG NFTs section */}
      {nftCount > 0 && (
        <div className="card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nomu-500/30 to-transparent" />
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <span>🐟</span>
              Nomu OG Collection
              <span className="badge-og text-[10px]">{nftCount}</span>
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-nomu-400" />
                <span className="text-[10px] text-dark-muted">Held</span>
              </div>
              {profile.ogNfts.some((n) => !n.held) && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  <span className="text-[10px] text-dark-muted">Sold</span>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {profile.ogNfts.map((nft) => (
              <a
                key={nft.mint}
                href={`https://solscan.io/token/${nft.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`group rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                  nft.held
                    ? "border-dark-border bg-dark-surface/30 hover:border-nomu-500/30 hover:shadow-nomu"
                    : "border-red-500/20 bg-dark-surface/15 hover:border-red-500/40"
                }`}
              >
                {nft.image ? (
                  <div className="aspect-square bg-dark-surface relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={nft.image}
                      alt={nft.name}
                      className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                        nft.held ? "" : "opacity-40 grayscale"
                      }`}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {!nft.held && (
                      <div className="absolute top-2 right-2 rounded-full bg-red-500/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        SOLD
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-square bg-dark-surface flex items-center justify-center">
                    <span className={`text-3xl group-hover:animate-float ${nft.held ? "" : "opacity-40 grayscale"}`}>🐠</span>
                  </div>
                )}
                <div className="p-3">
                  <p className={`text-xs font-semibold truncate transition-colors ${
                    nft.held ? "group-hover:text-nomu-400" : "text-dark-muted group-hover:text-red-400"
                  }`}>
                    {nft.name}
                  </p>
                  <p className="text-[10px] text-dark-muted font-mono mt-0.5">
                    {nft.mint.slice(0, 6)}...{nft.mint.slice(-4)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* NFT Events */}
      {profile.nftEvents.length > 0 && (
        <NftEventsList events={profile.nftEvents} />
      )}

      {/* Events */}
      {sim && <EventsList events={sim.events} />}

      {/* Disclaimer */}
      <p className="text-center text-xs text-dark-muted pb-8">
        Unofficial simulation based on public docs. Not financial advice. 🐟{" "}
        <Link href="/disclaimer" className="text-nomu-400 hover:underline">
          Full disclaimer
        </Link>
      </p>
    </div>
  );
}
