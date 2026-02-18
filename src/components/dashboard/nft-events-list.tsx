"use client";

import type { NftEvent } from "@/lib/types";

interface NftEventsListProps {
  events: NftEvent[];
}

/**
 * Timeline of NFT acquisition/disposal events with thumbnails.
 * Styled consistently with the DEGEN theme (orange/blue, glass morphism).
 */
export function NftEventsList({ events }: NftEventsListProps) {
  if (events.length === 0) return null;

  const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="card relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nomu-500/30 to-transparent" />

      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <span>🖼️</span>
          NFT Activity
          <span className="rounded-full bg-nomu-500/10 border border-nomu-500/20 px-2 py-0.5 text-[10px] font-semibold text-nomu-400">
            {events.length}
          </span>
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-nomu-400" />
            <span className="text-[10px] text-dark-muted">Acquired</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span className="text-[10px] text-dark-muted">Sold</span>
          </div>
        </div>
      </div>

      <div className="relative space-y-0">
        {/* Timeline vertical line */}
        <div className="absolute left-5 top-2 bottom-2 w-px bg-gradient-to-b from-nomu-500/40 via-ocean-500/20 to-transparent" />

        {sorted.map((event, idx) => {
          const isAcquired = event.type === "acquired";
          const isLast = idx === sorted.length - 1;
          const date = new Date(event.timestamp * 1000);
          const formattedDate = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const formattedTime = date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={event.signature}
              className="relative flex items-center gap-4 py-3 group"
            >
              {/* NFT thumbnail as timeline marker */}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={`h-10 w-10 rounded-xl border-2 overflow-hidden bg-dark-surface transition-all duration-300 group-hover:scale-110 ${
                    isAcquired
                      ? "border-nomu-500/40 group-hover:border-nomu-500/70 group-hover:shadow-nomu"
                      : "border-red-500/40 group-hover:border-red-500/70"
                  }`}
                >
                  {event.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.image}
                      alt={event.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-lg">🐟</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isAcquired ? "text-nomu-400" : "text-red-400"
                    }`}
                  >
                    {isAcquired ? "Acquired" : "Sold"}
                  </span>
                  <span className="text-sm font-semibold text-dark-text truncate">
                    {event.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-dark-muted">
                    {formattedDate} &middot; {formattedTime}
                  </span>
                  <span className="text-[10px] text-dark-muted/50 font-mono">
                    {event.mint.slice(0, 4)}...{event.mint.slice(-4)}
                  </span>
                </div>
              </div>

              {/* Solscan link */}
              <a
                href={`https://solscan.io/tx/${event.signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg border border-dark-border bg-dark-surface/50 px-2 py-1 text-[10px] font-mono text-dark-muted transition-all duration-200 hover:border-nomu-500/30 hover:text-nomu-400 flex-shrink-0"
              >
                <span>
                  {event.signature.slice(0, 4)}...{event.signature.slice(-4)}
                </span>
                <svg
                  className="h-2.5 w-2.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>

              {/* Separator */}
              {!isLast && (
                <div className="absolute bottom-0 left-14 right-0 h-px bg-dark-border/30" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
