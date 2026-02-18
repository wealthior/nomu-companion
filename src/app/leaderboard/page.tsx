"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/ui/navbar";
import { WalletInput } from "@/components/wallet/wallet-input";
import type { LeaderboardEntryDTO } from "@/lib/types";
import Link from "next/link";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntryDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));

      const res = await fetch(`/api/leaderboard?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setEntries(data.entries);
      setTotal(data.total);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleSearch = (wallet: string) => {
    setSearch(wallet);
    setPage(1);
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-lg font-semibold">Leaderboard</h1>
            <p className="text-xs text-dark-muted mt-1">
              {total} community members opted in
            </p>
          </div>
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="btn-secondary text-xs"
            >
              Clear Search
            </button>
          )}
        </div>

        <div className="mb-6">
          <WalletInput
            placeholder="Search by wallet address..."
            buttonLabel="Search"
            onSubmit={handleSearch}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-nomu-500 border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-sm text-dark-muted">
              {search
                ? "No matching wallet found on the leaderboard."
                : "No entries yet. Be the first to opt in!"}
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border bg-dark-bg/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-dark-muted">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-dark-muted">
                      Wallet
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-dark-muted">
                      Balance
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-dark-muted">
                      Score
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-dark-muted">
                      Weight
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.wallet}
                      className="border-b border-dark-border/50 hover:bg-dark-bg/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            entry.rank <= 3
                              ? "bg-nomu-500/10 text-nomu-400"
                              : "text-dark-muted"
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/u/${entry.wallet}`}
                            className="font-mono text-xs hover:text-nomu-400 transition-colors"
                          >
                            {entry.wallet.slice(0, 4)}...{entry.wallet.slice(-4)}
                          </Link>
                          {entry.ogFlag && (
                            <span className="badge-og text-[10px]">OG</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {entry.balance.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-nomu-400 font-medium text-xs">
                          {entry.simulatedScore.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-medium">
                        {entry.simulatedWeight.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > 100 && !search && (
              <div className="flex items-center justify-center gap-2 border-t border-dark-border p-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-secondary text-xs"
                >
                  Previous
                </button>
                <span className="text-xs text-dark-muted">
                  Page {page} of {Math.ceil(total / 100)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 100 >= total}
                  className="btn-secondary text-xs"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
