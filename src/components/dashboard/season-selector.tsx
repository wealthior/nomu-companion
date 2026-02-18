"use client";

import { getAllSeasons } from "@/lib/simulation/season";

interface SeasonSelectorProps {
  /** Currently selected season ID, or null for current */
  currentSeasonId: string | null;
  /** Callback when user picks a different season */
  onSeasonChange: (seasonId: string) => void;
}

/**
 * Dropdown to switch between historical seasons (TGE Nov 2025 to now).
 */
export function SeasonSelector({
  currentSeasonId,
  onSeasonChange,
}: SeasonSelectorProps) {
  const seasons = getAllSeasons();

  // Determine which season is selected in the dropdown
  const selectedId =
    currentSeasonId ?? seasons.find((s) => s.isCurrent)?.id ?? seasons[0]?.id;

  return (
    <select
      value={selectedId}
      onChange={(e) => onSeasonChange(e.target.value)}
      className="rounded-xl border border-dark-border bg-dark-surface/80 px-3 py-1.5 text-xs font-semibold text-dark-text focus:border-nomu-500/50 focus:outline-none focus:ring-1 focus:ring-nomu-500/30 transition-all duration-200 cursor-pointer appearance-none backdrop-blur-sm"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23fb923c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
        paddingRight: "28px",
      }}
    >
      {seasons.map((season) => (
        <option key={season.id} value={season.id}>
          {season.label}
          {season.isCurrent ? " (Current)" : ""}
        </option>
      ))}
    </select>
  );
}
