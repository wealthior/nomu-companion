"use client";

import { useWalletData } from "@/hooks/use-wallet-data";
import { Navbar } from "@/components/ui/navbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { ScoreGauge } from "@/components/dashboard/score-gauge";
import Link from "next/link";

interface ProfileClientProps {
  wallet: string;
}

export function ProfileClient({ wallet }: ProfileClientProps) {
  const { profile, loading, error } = useWalletData(wallet);
  const shortWallet = `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${baseUrl}/u/${wallet}`;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-nomu-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Profile header */}
            <div className="card text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <h1 className="text-xl font-bold font-mono">{shortWallet}</h1>
                {profile.ogNfts.some((n) => n.held) && (
                  <span className="badge-og">OG Holder</span>
                )}
              </div>
              <p className="text-xs text-dark-muted font-mono mb-4">{wallet}</p>
              {profile.leaderboardRank && (
                <p className="text-sm text-dark-muted">
                  Leaderboard Rank:{" "}
                  <span className="font-semibold text-nomu-400">
                    #{profile.leaderboardRank}
                  </span>
                </p>
              )}
            </div>

            {/* Score gauge */}
            <div className="card flex justify-center py-8">
              <ScoreGauge
                score={profile.simulation?.finalScore ?? 50}
                size="lg"
              />
            </div>

            {/* Stats */}
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
              <StatCard
                label="$NOMU Balance"
                value={profile.balance.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              />
              <StatCard
                label="Value Score"
                value={profile.simulation?.finalScore.toFixed(1) ?? "50.0"}
                accent
              />
              <StatCard
                label="Weight"
                value={
                  profile.simulation?.weight.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  }) ?? "0"
                }
              />
            </div>

            {/* Share */}
            <div className="card text-center space-y-3">
              <h3 className="text-sm font-semibold">Share Your Profile</h3>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="w-full sm:w-auto flex-1 rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-xs font-mono text-dark-muted"
                />
                <button
                  onClick={() => navigator.clipboard?.writeText(shareUrl)}
                  className="btn-secondary text-xs whitespace-nowrap"
                >
                  Copy Link
                </button>
              </div>
              <p className="text-xs text-dark-muted">
                The link includes an auto-generated OG image for social sharing.
              </p>
            </div>

            <div className="text-center">
              <Link href="/app" className="btn-secondary text-xs">
                Open Full Dashboard
              </Link>
            </div>

            <p className="text-center text-xs text-dark-muted pb-8">
              Unofficial simulation based on public docs. Not financial advice.
            </p>
          </div>
        ) : null}
      </main>
    </>
  );
}
