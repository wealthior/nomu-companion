import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWalletBalance, getWalletSimulation, getWalletOgNfts } from "@/lib/services/wallet-service";
import { invalidateCache } from "@/lib/cache";

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const entries = await prisma.leaderboardEntry.findMany({
      select: { wallet: true },
    });

    let updated = 0;
    let errors = 0;

    for (const { wallet } of entries) {
      try {
        // Invalidate cache for this wallet
        invalidateCache(`balance:${wallet}`);
        invalidateCache(`events:${wallet}`);
        invalidateCache(`sim:${wallet}`);
        invalidateCache(`og:${wallet}`);

        const [balance, simulation, ogNfts] = await Promise.all([
          getWalletBalance(wallet),
          getWalletSimulation(wallet),
          getWalletOgNfts(wallet),
        ]);

        await prisma.leaderboardEntry.update({
          where: { wallet },
          data: {
            balance,
            simulatedScore: simulation.finalScore,
            simulatedWeight: simulation.weight,
            ogFlag: ogNfts.some((n) => n.held),
          },
        });

        updated++;
      } catch (error) {
        console.error(`Failed to refresh ${wallet}:`, error);
        errors++;
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      success: true,
      updated,
      errors,
      total: entries.length,
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { error: "Refresh failed" },
      { status: 500 }
    );
  }
}
