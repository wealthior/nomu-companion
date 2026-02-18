import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { isValidSolanaAddress } from "@/lib/solana/adapter";
import { getWalletBalance, getWalletSimulation, getWalletOgNfts } from "@/lib/services/wallet-service";

export const runtime = "nodejs";

/**
 * Generates an OG share card image for a wallet.
 * GET /api/og?wallet=...
 */
export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");

  if (!wallet || !isValidSolanaAddress(wallet)) {
    return new Response("Invalid wallet", { status: 400 });
  }

  try {
    const [balance, simulation, ogNfts] = await Promise.all([
      getWalletBalance(wallet),
      getWalletSimulation(wallet),
      getWalletOgNfts(wallet),
    ]);

    const shortWallet = `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
    const hasOg = ogNfts.some((n) => n.held);
    const score = simulation.finalScore.toFixed(1);
    const weight = simulation.weight.toFixed(0);
    const balanceStr = balance.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)",
            padding: "60px",
            fontFamily: "Inter, system-ui, sans-serif",
            color: "#e4e4e7",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background glow */}
          <div
            style={{
              position: "absolute",
              top: "-100px",
              right: "-100px",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(34, 197, 94, 0.08) 0%, transparent 70%)",
              display: "flex",
            }}
          />

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "16px", color: "#71717a", letterSpacing: "2px", textTransform: "uppercase" as const }}>
                Nomu Staking Companion
              </span>
              <span style={{ fontSize: "28px", fontWeight: 700, marginTop: "4px", display: "flex", alignItems: "center", gap: "12px" }}>
                {shortWallet}
                {hasOg && (
                  <span style={{ fontSize: "14px", color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "4px 12px", borderRadius: "20px", border: "1px solid rgba(245,158,11,0.2)" }}>
                    OG Holder
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: "flex", gap: "40px", marginTop: "60px", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: "16px", padding: "32px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: "14px", color: "#71717a", textTransform: "uppercase" as const, letterSpacing: "1.5px" }}>
                $NOMU Balance
              </span>
              <span style={{ fontSize: "48px", fontWeight: 800, marginTop: "8px", color: "#e4e4e7" }}>
                {balanceStr}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: "16px", padding: "32px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: "14px", color: "#71717a", textTransform: "uppercase" as const, letterSpacing: "1.5px" }}>
                Value Score
              </span>
              <span style={{ fontSize: "48px", fontWeight: 800, marginTop: "8px", color: "#22c55e" }}>
                {score}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: "16px", padding: "32px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: "14px", color: "#71717a", textTransform: "uppercase" as const, letterSpacing: "1.5px" }}>
                Weight
              </span>
              <span style={{ fontSize: "48px", fontWeight: 800, marginTop: "8px", color: "#e4e4e7" }}>
                {weight}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "40px" }}>
            <span style={{ fontSize: "12px", color: "#52525b" }}>
              Unofficial simulation based on public docs
            </span>
            <span style={{ fontSize: "14px", color: "#71717a" }}>
              nomu-companion.vercel.app
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error("OG image error:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
