"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navbar } from "@/components/ui/navbar";
import { WalletInput } from "@/components/wallet/wallet-input";

export default function LandingPage() {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();

  useEffect(() => {
    if (publicKey) {
      router.push(`/app?wallet=${publicKey.toBase58()}`);
    }
  }, [publicKey, router]);

  return (
    <>
      <Navbar />
      <main className="relative mx-auto max-w-6xl px-4">
        {/* Decorative background glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-nomu-500/8 blur-[100px]" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-ocean-500/5 blur-[100px]" />
        </div>

        {/* Hero */}
        <div className="relative flex flex-col items-center text-center pt-20 pb-16">
          {/* Floating fish decoration */}
          <div className="absolute top-12 left-[10%] text-3xl animate-float opacity-20 select-none">🐟</div>
          <div className="absolute top-28 right-[12%] text-2xl animate-float opacity-15 select-none" style={{ animationDelay: "2s" }}>🐠</div>
          <div className="absolute bottom-20 left-[15%] text-xl animate-wave opacity-10 select-none">🌊</div>

          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-nomu-500/20 bg-nomu-500/5 px-5 py-2 backdrop-blur-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-nomu-400 animate-pulse-glow" />
            <span className="text-xs font-semibold text-nomu-400 uppercase tracking-wider">
              Community Tool &middot; Open Source
            </span>
          </div>

          <h1 className="text-5xl font-black tracking-tight sm:text-6xl md:text-7xl leading-[1.1]">
            <span className="gradient-text">NOMU</span>
            <br />
            <span className="text-dark-text">Staking</span>{" "}
            <span className="text-ocean-400">Companion</span>
          </h1>

          <p className="mt-8 max-w-xl text-base text-dark-muted leading-relaxed">
            Track your <span className="text-nomu-400 font-semibold">Invisible Staking</span> score,
            simulate sells before you ape out, flex your{" "}
            <span className="text-nomu-400 font-semibold">OG NFTs</span>,
            and climb the community leaderboard.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
            <button
              onClick={() => setVisible(true)}
              className="btn-primary w-full sm:w-auto text-base px-8 py-3.5 gap-2"
            >
              <span>🐠</span>
              Connect Wallet
            </button>
            <Link href="/leaderboard" className="btn-secondary w-full sm:w-auto text-base px-8 py-3.5">
              View Leaderboard
            </Link>
          </div>

          <div className="mt-8 w-full max-w-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-dark-border to-transparent" />
              <span className="text-xs text-dark-muted font-medium">or paste any wallet</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-dark-border to-transparent" />
            </div>
            <WalletInput
              placeholder="Paste a Solana wallet address..."
              buttonLabel="Dive In"
            />
          </div>
        </div>

        {/* Feature cards */}
        <div className="relative mt-8 mb-20">
          <h2 className="text-center text-2xl font-black mb-3">
            Why <span className="gradient-text-orange">NOMU</span> Companion?
          </h2>
          <p className="text-center text-sm text-dark-muted mb-12 max-w-lg mx-auto">
            $NOMU redistributes trading fees to diamond hands. But your score is invisible on-chain.
            We make it visible.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card-hover group">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-nomu-500/10 border border-nomu-500/20 text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                🔍
              </div>
              <h3 className="text-base font-bold">See Your Hidden Score</h3>
              <p className="mt-2 text-sm text-dark-muted leading-relaxed">
                Your Value Score (0&ndash;100) is invisible on-chain.
                We simulate it live so you always know where you stand.
              </p>
            </div>

            <div className="card-hover group">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ocean-500/10 border border-ocean-500/20 text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                🎣
              </div>
              <h3 className="text-base font-bold">Simulate Before You Sell</h3>
              <p className="mt-2 text-sm text-dark-muted leading-relaxed">
                Drag the What-If slider to see how selling would nuke your score.
                Avoid the anti-dump rule (&gt;60% in 24h = rekt).
              </p>
            </div>

            <div className="card-hover group sm:col-span-2 lg:col-span-1">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-nomu-500/10 border border-nomu-500/20 text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                🏆
              </div>
              <h3 className="text-base font-bold">Climb the Leaderboard</h3>
              <p className="mt-2 text-sm text-dark-muted leading-relaxed">
                Opt-in with a signed message and flex your position.
                OG NFT holders get a special badge. DCA like a chad for 1.2x multiplier.
              </p>
            </div>
          </div>
        </div>

        {/* Scoring explainer */}
        <div className="relative mb-20">
          <div className="card overflow-hidden">
            {/* Decorative top line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nomu-500/40 to-transparent" />

            <h3 className="text-lg font-black mb-6 flex items-center gap-2">
              <span>🐟</span>
              How does scoring work?
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-dark-surface/50 p-5 border border-dark-border/50 transition-all duration-300 hover:border-emerald-500/20">
                <div className="text-3xl mb-3">📈</div>
                <p className="text-sm font-bold text-emerald-400 mb-1">Buy = Score Up</p>
                <p className="text-xs text-dark-muted leading-relaxed">
                  Each buy pushes your score toward 100. Consistent DCA buying earns up to 1.2x bonus multiplier.
                </p>
              </div>
              <div className="rounded-xl bg-dark-surface/50 p-5 border border-dark-border/50 transition-all duration-300 hover:border-red-500/20">
                <div className="text-3xl mb-3">📉</div>
                <p className="text-sm font-bold text-red-400 mb-1">Sell = Score Down</p>
                <p className="text-xs text-dark-muted leading-relaxed">
                  Selling hurts proportional to how much you dump. Penalty is 1.5x the sell percentage.
                </p>
              </div>
              <div className="rounded-xl bg-dark-surface/50 p-5 border border-dark-border/50 transition-all duration-300 hover:border-red-500/20">
                <div className="text-3xl mb-3">🚨</div>
                <p className="text-sm font-bold text-red-400 mb-1">Anti-Dump Rule</p>
                <p className="text-xs text-dark-muted leading-relaxed">
                  Sell &gt;60% in 24h? Disqualified for the season. Score goes to zero. Don&apos;t be that guy.
                </p>
              </div>
              <div className="rounded-xl bg-dark-surface/50 p-5 border border-dark-border/50 transition-all duration-300 hover:border-nomu-500/20">
                <div className="text-3xl mb-3">💰</div>
                <p className="text-sm font-bold text-nomu-400 mb-1">Reward Weight</p>
                <p className="text-xs text-dark-muted leading-relaxed">
                  Your payout = Score &times; Balance. Big bag + diamond hands = maximum rewards every season.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer disclaimer */}
        <div className="pb-12 text-center">
          <p className="text-xs text-dark-muted">
            Unofficial community tool. Scores are simulated, not official.{" "}
            <Link href="/disclaimer" className="text-nomu-400 hover:underline">
              Full disclaimer
            </Link>
            . Built with 🐟 by the community.
          </p>
        </div>
      </main>
    </>
  );
}
