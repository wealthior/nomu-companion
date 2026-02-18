import { NextRequest, NextResponse } from "next/server";
import { isValidSolanaAddress } from "@/lib/solana/adapter";
import { getWalletProfile } from "@/lib/services/wallet-service";
import { rateLimitResponse } from "@/lib/rate-limit";

/** Maximum time to wait for the wallet profile before timing out */
const PROFILE_TIMEOUT_MS = 60_000;

/** Season ID format: YYYY-MM */
const SEASON_ID_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * GET /api/wallet/[address]?season=2025-11
 * Returns wallet profile with balance, simulation, and leaderboard info.
 * Optional `season` query param to fetch a specific season (e.g. "2025-11").
 * Gracefully degrades if RPC rate limits are hit.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const limited = rateLimitResponse(ip);
  if (limited) return limited;

  if (!isValidSolanaAddress(address)) {
    return NextResponse.json(
      { error: "Invalid Solana wallet address" },
      { status: 400 }
    );
  }

  // Parse optional season query parameter
  const seasonParam = request.nextUrl.searchParams.get("season");
  let seasonId: string | undefined;
  if (seasonParam) {
    if (!SEASON_ID_REGEX.test(seasonParam)) {
      return NextResponse.json(
        { error: "Invalid season format. Expected YYYY-MM (e.g. 2025-11)" },
        { status: 400 }
      );
    }
    seasonId = seasonParam;
  }

  try {
    const profile = await Promise.race([
      getWalletProfile(address, seasonId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timed out")), PROFILE_TIMEOUT_MS)
      ),
    ]);
    return NextResponse.json(profile);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`[wallet-api] Error for ${address.slice(0, 8)}...:`, message);

    // Return a more helpful error message
    const is429 = message.includes("429");
    const isTimeout = message.includes("timed out");

    return NextResponse.json(
      {
        error: is429
          ? "Solana RPC rate limit reached. Please try again in a few seconds."
          : isTimeout
            ? "Request timed out. The Solana RPC may be busy, please try again."
            : "Failed to fetch wallet data",
      },
      { status: is429 ? 429 : isTimeout ? 504 : 500 }
    );
  }
}
