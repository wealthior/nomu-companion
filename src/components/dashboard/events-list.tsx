"use client";

import type { TokenEvent } from "@/lib/types";

interface EventsListProps {
  events: TokenEvent[];
}

/**
 * Fancy transaction timeline with visual flow indicators.
 * Shows buys/sells with amounts, dates, and Solscan links.
 */
export function EventsList({ events }: EventsListProps) {
  if (events.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="text-base">🐟</span>
          Transaction Flow
        </h3>
        <div className="flex flex-col items-center py-8 text-center">
          <div className="text-4xl mb-3 animate-wave">🌊</div>
          <p className="text-sm text-dark-muted">
            No waves this season. Calm waters.
          </p>
          <p className="text-xs text-dark-muted/60 mt-1">
            Buy or sell $NOMU to see your transaction history here.
          </p>
        </div>
      </div>
    );
  }

  const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);
  const maxDelta = Math.max(...sorted.map((e) => Math.abs(e.deltaAmount)));

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span className="text-base">🐟</span>
          Transaction Flow
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-dark-muted">Buy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span className="text-[10px] text-dark-muted">Sell</span>
          </div>
        </div>
      </div>

      <div className="relative space-y-0">
        {/* Timeline vertical line */}
        <div className="timeline-line" />

        {sorted.slice(0, 30).map((event, idx) => {
          const isBuy = event.type === "buy";
          const isSell = event.type === "sell";
          const barWidth = maxDelta > 0
            ? Math.max(8, (Math.abs(event.deltaAmount) / maxDelta) * 100)
            : 50;
          const isLast = idx === Math.min(sorted.length, 30) - 1;

          return (
            <div
              key={event.signature}
              className="relative flex items-start gap-4 py-3 group"
            >
              {/* Timeline dot */}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-110 ${
                    isBuy
                      ? "bg-emerald-500/10 border-emerald-500/30 group-hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                      : isSell
                        ? "bg-red-500/10 border-red-500/30 group-hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                        : "bg-dark-surface border-dark-border"
                  }`}
                >
                  <span className="text-lg">
                    {isBuy ? "🐠" : isSell ? "🎣" : "🌊"}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        isBuy ? "text-emerald-400" : isSell ? "text-red-400" : "text-dark-muted"
                      }`}
                    >
                      {isBuy ? "Bought" : isSell ? "Sold" : "Transfer"}
                    </span>
                    <span className="text-sm font-mono font-bold text-dark-text">
                      {Math.abs(event.deltaAmount).toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <span className="text-xs text-dark-muted">$NOMU</span>
                  </div>

                  <a
                    href={`https://solscan.io/tx/${event.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-dark-border bg-dark-surface/50 px-2 py-0.5 text-[10px] font-mono text-dark-muted transition-all duration-200 hover:border-nomu-500/30 hover:text-nomu-400 flex-shrink-0"
                  >
                    {event.signature.slice(0, 4)}...{event.signature.slice(-4)}
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                {/* Amount bar visualization */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-dark-surface overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isBuy
                          ? "bg-gradient-to-r from-emerald-500/60 to-emerald-400/40"
                          : isSell
                            ? "bg-gradient-to-r from-red-500/60 to-red-400/40"
                            : "bg-dark-muted/30"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-dark-muted/60 whitespace-nowrap font-mono">
                    bal: {event.postBalance.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>

                {/* Date + confidence */}
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10px] text-dark-muted">
                    {new Date(event.timestamp * 1000).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <ConfidencePill confidence={event.confidence} />
                </div>
              </div>

              {/* Separator line */}
              {!isLast && (
                <div className="absolute bottom-0 left-14 right-0 h-px bg-dark-border/50" />
              )}
            </div>
          );
        })}

        {sorted.length > 30 && (
          <div className="pt-3 pl-14 text-xs text-dark-muted">
            + {sorted.length - 30} more transactions this season
          </div>
        )}
      </div>
    </div>
  );
}

function ConfidencePill({ confidence }: { confidence: TokenEvent["confidence"] }) {
  const config = {
    high: { label: "High", color: "text-emerald-400/60" },
    medium: { label: "Med", color: "text-yellow-400/60" },
    low: { label: "Low", color: "text-orange-400/60" },
    unknown: { label: "?", color: "text-dark-muted/40" },
  }[confidence];

  return (
    <span className={`text-[9px] font-medium uppercase tracking-wider ${config.color}`}>
      {config.label} conf.
    </span>
  );
}
