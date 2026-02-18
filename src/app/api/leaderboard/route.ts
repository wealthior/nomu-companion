import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimitResponse } from "@/lib/rate-limit";
import { LEADERBOARD_PAGE_SIZE } from "@/lib/constants";
import { cached, CACHE_TTL } from "@/lib/cache";
import type { LeaderboardEntryDTO } from "@/lib/types";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const limited = rateLimitResponse(ip);
  if (limited) return limited;

  const search = request.nextUrl.searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10));

  try {
    if (search) {
      // Search for a specific wallet
      const entry = await prisma.leaderboardEntry.findUnique({
        where: { wallet: search },
      });

      if (!entry) {
        return NextResponse.json({ entries: [], total: 0 });
      }

      const rank = await prisma.leaderboardEntry.count({
        where: { simulatedWeight: { gt: entry.simulatedWeight } },
      });

      const dto: LeaderboardEntryDTO = {
        rank: rank + 1,
        wallet: entry.wallet,
        balance: entry.balance,
        simulatedScore: entry.simulatedScore,
        simulatedWeight: entry.simulatedWeight,
        ogFlag: entry.ogFlag,
        displayName: entry.displayName,
        updatedAt: entry.updatedAt.toISOString(),
      };

      return NextResponse.json({ entries: [dto], total: 1 });
    }

    const cacheKey = `leaderboard:page:${page}`;
    const result = await cached(cacheKey, CACHE_TTL.leaderboard, async () => {
      const [entries, total] = await Promise.all([
        prisma.leaderboardEntry.findMany({
          orderBy: { simulatedWeight: "desc" },
          skip: (page - 1) * LEADERBOARD_PAGE_SIZE,
          take: LEADERBOARD_PAGE_SIZE,
        }),
        prisma.leaderboardEntry.count(),
      ]);

      const startRank = (page - 1) * LEADERBOARD_PAGE_SIZE;
      const dtos: LeaderboardEntryDTO[] = entries.map((entry, index) => ({
        rank: startRank + index + 1,
        wallet: entry.wallet,
        balance: entry.balance,
        simulatedScore: entry.simulatedScore,
        simulatedWeight: entry.simulatedWeight,
        ogFlag: entry.ogFlag,
        displayName: entry.displayName,
        updatedAt: entry.updatedAt.toISOString(),
      }));

      return { entries: dtos, total };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
