import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { isValidSolanaAddress } from "@/lib/solana/adapter";
import { getWalletSimulation, getWalletBalance, getWalletOgNfts } from "@/lib/services/wallet-service";
import { prisma } from "@/lib/db";
import { rateLimitResponse } from "@/lib/rate-limit";
import { OPT_IN_MESSAGE_PREFIX } from "@/lib/constants";

interface OptInRequest {
  wallet: string;
  signature: string;
  message: string;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const limited = rateLimitResponse(ip);
  if (limited) return limited;

  let body: OptInRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { wallet, signature, message } = body;

  if (!wallet || !isValidSolanaAddress(wallet)) {
    return NextResponse.json(
      { error: "Invalid wallet address" },
      { status: 400 }
    );
  }

  if (!signature || !message) {
    return NextResponse.json(
      { error: "Missing signature or message" },
      { status: 400 }
    );
  }

  // Validate message format
  if (!message.startsWith(OPT_IN_MESSAGE_PREFIX)) {
    return NextResponse.json(
      { error: "Invalid message format" },
      { status: 400 }
    );
  }

  // Verify signature
  try {
    const publicKey = new PublicKey(wallet);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);

    const valid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Signature verification failed" },
      { status: 401 }
    );
  }

  // Fetch current data
  try {
    const [simulation, balance, ogNfts] = await Promise.all([
      getWalletSimulation(wallet),
      getWalletBalance(wallet),
      getWalletOgNfts(wallet),
    ]);

    const entry = await prisma.leaderboardEntry.upsert({
      where: { wallet },
      update: {
        balance,
        simulatedScore: simulation.finalScore,
        simulatedWeight: simulation.weight,
        ogFlag: ogNfts.some((n) => n.held),
        signatureHash: signature.slice(0, 32),
      },
      create: {
        wallet,
        signatureHash: signature.slice(0, 32),
        balance,
        simulatedScore: simulation.finalScore,
        simulatedWeight: simulation.weight,
        ogFlag: ogNfts.some((n) => n.held),
      },
    });

    return NextResponse.json({
      success: true,
      entry: {
        wallet: entry.wallet,
        balance: entry.balance,
        simulatedScore: entry.simulatedScore,
        simulatedWeight: entry.simulatedWeight,
        ogFlag: entry.ogFlag,
      },
    });
  } catch (error) {
    console.error("Opt-in error:", error);
    return NextResponse.json(
      { error: "Failed to process opt-in" },
      { status: 500 }
    );
  }
}
