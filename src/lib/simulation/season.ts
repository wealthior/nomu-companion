import { getSeasonBounds, getSeasonId } from "./engine";
import { TGE_SEASON_ID } from "@/lib/constants";

/**
 * Returns the current season ID (UTC month).
 */
export function getCurrentSeasonId(): string {
  return getSeasonId(Math.floor(Date.now() / 1000));
}

/**
 * Returns the bounds of the current season.
 */
export function getCurrentSeasonBounds(): { start: number; end: number } {
  return getSeasonBounds(getCurrentSeasonId());
}

/**
 * Formats a season ID as a human-readable string.
 * @param seasonId - e.g. "2025-03"
 * @returns e.g. "March 2025"
 */
export function formatSeasonId(seasonId: string): string {
  const [yearStr, monthStr] = seasonId.split("-");
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthIndex = parseInt(monthStr, 10) - 1;
  return `${monthNames[monthIndex]} ${yearStr}`;
}

/**
 * Returns progress through the current season as a percentage (0-100).
 */
export function getSeasonProgress(): number {
  const now = Math.floor(Date.now() / 1000);
  const { start, end } = getCurrentSeasonBounds();
  const total = end - start;
  const elapsed = now - start;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

/**
 * Returns progress through an arbitrary season as a percentage (0-100).
 * Past seasons return 100, future seasons return 0.
 * @param seasonId - e.g. "2025-11"
 */
export function getSeasonProgressById(seasonId: string): number {
  const now = Math.floor(Date.now() / 1000);
  const { start, end } = getSeasonBounds(seasonId);
  if (now >= end) return 100;
  if (now <= start) return 0;
  const total = end - start;
  const elapsed = now - start;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

/**
 * Returns all season IDs from TGE (November 2025) to the current month, newest first.
 * Each entry has { id, label, isCurrent }.
 */
export function getAllSeasons(): Array<{
  id: string;
  label: string;
  isCurrent: boolean;
}> {
  const current = getCurrentSeasonId();
  const [tgeYear, tgeMonth] = TGE_SEASON_ID.split("-").map(Number);
  const [curYear, curMonth] = current.split("-").map(Number);

  const seasons: Array<{ id: string; label: string; isCurrent: boolean }> = [];

  let y = curYear;
  let m = curMonth;

  // Walk backwards from current month to TGE month
  while (y > tgeYear || (y === tgeYear && m >= tgeMonth)) {
    const id = `${y}-${String(m).padStart(2, "0")}`;
    seasons.push({
      id,
      label: formatSeasonId(id),
      isCurrent: id === current,
    });
    m--;
    if (m < 1) {
      m = 12;
      y--;
    }
  }

  return seasons;
}
