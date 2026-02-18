import { NextRequest, NextResponse } from "next/server";
import { isValidSolanaAddress } from "@/lib/solana/adapter";
import { getWalletSimulation } from "@/lib/services/wallet-service";
import { simulateWhatIf } from "@/lib/simulation";
import { rateLimitResponse } from "@/lib/rate-limit";
import { SIM_DEFAULTS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const limited = rateLimitResponse(ip);
  if (limited) return limited;

  const wallet = request.nextUrl.searchParams.get("wallet");
  const sellPercent = parseFloat(
    request.nextUrl.searchParams.get("sellPercent") ?? "0"
  );

  if (!wallet || !isValidSolanaAddress(wallet)) {
    return NextResponse.json(
      { error: "Invalid or missing wallet address" },
      { status: 400 }
    );
  }

  if (isNaN(sellPercent) || sellPercent < 0 || sellPercent > 100) {
    return NextResponse.json(
      { error: "sellPercent must be between 0 and 100" },
      { status: 400 }
    );
  }

  try {
    const simulation = await getWalletSimulation(wallet);

    if (sellPercent > 0) {
      const whatIf = simulateWhatIf(simulation, sellPercent, SIM_DEFAULTS);
      return NextResponse.json({
        current: simulation,
        whatIf,
      });
    }

    return NextResponse.json({ current: simulation, whatIf: null });
  } catch (error) {
    console.error("Simulation error:", error);
    return NextResponse.json(
      { error: "Simulation failed" },
      { status: 500 }
    );
  }
}
