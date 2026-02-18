import { NextRequest, NextResponse } from "next/server";
import { isValidSolanaAddress } from "@/lib/solana/adapter";
import { rateLimitResponse } from "@/lib/rate-limit";
import { fillMissingNftActivity } from "@/lib/services/nft-activity-fill";

/**
 * POST /api/wallet/[address]/nft-activity
 *
 * Background fill endpoint for NFT activity timestamps.
 * Called by the frontend after the main profile loads to fill in
 * any timestamps that were missed due to RPC rate limits.
 *
 * This runs WITHOUT competing for RPC budget with the simulation
 * (which should already be cached by the time the frontend calls this).
 *
 * Returns the count of newly discovered timestamps.
 */
export async function POST(
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

  try {
    const result = await Promise.race([
      fillMissingNftActivity(address),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("NFT activity fill timed out")), 55_000)
      ),
    ]);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[nft-activity] Error for ${address.slice(0, 8)}...:`, message);

    return NextResponse.json(
      { error: "Failed to fill NFT activity data" },
      { status: message.includes("timed out") ? 504 : 500 }
    );
  }
}
