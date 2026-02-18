"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Navbar } from "@/components/ui/navbar";
import { WalletInput } from "@/components/wallet/wallet-input";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

function DashboardInner() {
  const { publicKey } = useWallet();
  const searchParams = useSearchParams();
  const queryWallet = searchParams.get("wallet");
  const walletAddress = queryWallet ?? publicKey?.toBase58() ?? null;

  if (!walletAddress) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-dark-card border border-dark-border">
          <svg className="h-8 w-8 text-dark-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-2">No Wallet Connected</h2>
        <p className="text-sm text-dark-muted mb-6 max-w-sm">
          Connect your wallet or enter any Solana address to view the dashboard.
        </p>
        <div className="w-full max-w-md">
          <WalletInput placeholder="Enter wallet address..." buttonLabel="View Dashboard" />
        </div>
      </div>
    );
  }

  return <DashboardContent walletAddress={walletAddress} />;
}

export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-24">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-nomu-500 border-t-transparent" />
            </div>
          }
        >
          <DashboardInner />
        </Suspense>
      </main>
    </>
  );
}
