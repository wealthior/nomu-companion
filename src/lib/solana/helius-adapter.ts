import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { NOMU_MINT, NOMU_OG_COLLECTION_ADDRESS } from "@/lib/constants";
import type { DataAdapter, TokenEvent, OgNftInfo } from "@/lib/types";
import { createRpcAdapter } from "./rpc-adapter";

interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  tokenTransfers: Array<{
    mint: string;
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
  }>;
  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
}

interface HeliusAsset {
  id: string;
  content: {
    metadata: {
      name: string;
    };
    links?: {
      image?: string;
    };
    files?: Array<{ uri?: string }>;
  };
  grouping?: Array<{
    group_key: string;
    group_value: string;
  }>;
}

/**
 * Helius adapter for enriched transaction data and NFT detection.
 *
 * Key advantage over the free RPC adapter:
 * - ALL Solana RPC calls go through Helius RPC (generous per-key rate limits)
 * - No 429 cascade — activity timestamps for 20+ NFTs in one pass
 * - DAS API (getAssetsByOwner) returns NFT metadata + images in 1 call
 * - Helius Enhanced Transactions API for enriched swap detection
 */
export function createHeliusAdapter(
  apiKey: string,
  _rpcUrl: string
): DataAdapter {
  // Route ALL RPC calls through Helius (no public-RPC IP rate limit)
  const heliusRpcUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  const rpcAdapter = createRpcAdapter(heliusRpcUrl);
  const baseUrl = `https://api.helius.xyz/v0`;

  // Helius RPC connection for NFT signature lookups
  const connection = new Connection(heliusRpcUrl, {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
  });

  return {
    async getBalance(wallet: string): Promise<number> {
      return rpcAdapter.getBalance(wallet);
    },

    async getTokenEvents(
      wallet: string,
      startTime?: number,
      _endTime?: number
    ): Promise<TokenEvent[]> {
      const events: TokenEvent[] = [];
      let lastSignature: string | undefined;

      for (let page = 0; page < 10; page++) {
        const url = new URL(`${baseUrl}/addresses/${wallet}/transactions`);
        url.searchParams.set("api-key", apiKey);
        url.searchParams.set("type", "SWAP");
        if (lastSignature) {
          url.searchParams.set("before", lastSignature);
        }

        const response = await fetch(url.toString());
        if (!response.ok) break;

        const txs: HeliusTransaction[] = await response.json();
        if (txs.length === 0) break;

        for (const tx of txs) {
          if (startTime && tx.timestamp < startTime) continue;

          const nomuTransfers = tx.tokenTransfers.filter(
            (t) => t.mint === NOMU_MINT
          );

          if (nomuTransfers.length === 0) continue;

          let totalDelta = 0;
          for (const transfer of nomuTransfers) {
            if (transfer.toUserAccount === wallet) {
              totalDelta += transfer.tokenAmount;
            }
            if (transfer.fromUserAccount === wallet) {
              totalDelta -= transfer.tokenAmount;
            }
          }

          if (Math.abs(totalDelta) < 0.000001) continue;

          const type = totalDelta > 0 ? "buy" : "sell";
          const hasSolCounterflow = tx.nativeTransfers.some(
            (t) =>
              (type === "buy" && t.fromUserAccount === wallet) ||
              (type === "sell" && t.toUserAccount === wallet)
          );

          events.push({
            signature: tx.signature,
            timestamp: tx.timestamp,
            deltaAmount: totalDelta,
            postBalance: 0, // Will be calculated during simulation
            confidence: hasSolCounterflow ? "high" : "medium",
            type,
          });
        }

        lastSignature = txs[txs.length - 1].signature;

        if (
          startTime &&
          txs[txs.length - 1].timestamp < startTime
        ) {
          break;
        }
      }

      // Calculate running post-balances
      events.sort((a, b) => a.timestamp - b.timestamp);
      let runningBalance = 0;
      for (const event of events) {
        runningBalance += event.deltaAmount;
        event.postBalance = Math.max(runningBalance, 0);
      }

      return events;
    },

    /**
     * Fetches OG NFTs using Helius DAS searchAssets (by collection) + activity timestamps.
     *
     * 1. searchAssets with collection filter → all NOMU OG NFTs (1 call, no pagination issues)
     * 2. getSignaturesForAddress per NFT ATA → activity timestamps (parallel batches)
     *
     * With Helius RPC, all 20+ signature lookups complete without 429s.
     */
    async getOgNfts(wallet: string): Promise<OgNftInfo[]> {
      try {
        const response = await fetch(heliusRpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "og-nft-search",
            method: "searchAssets",
            params: {
              ownerAddress: wallet,
              grouping: ["collection", NOMU_OG_COLLECTION_ADDRESS],
              page: 1,
              limit: 100,
            },
          }),
        });

        if (!response.ok) return [];

        const data = await response.json();
        const assets: HeliusAsset[] = data.result?.items ?? [];

        const ogNfts: OgNftInfo[] = assets.map((asset) => ({
          mint: asset.id,
          name: asset.content?.metadata?.name ?? "Unknown",
          image:
            asset.content?.links?.image ??
            asset.content?.files?.[0]?.uri ??
            "",
          held: true,
          lastActivityTs: null,
          lastActivitySig: null,
        }));

        if (ogNfts.length === 0) return [];

        // Fetch activity timestamps via Helius RPC — parallel batches of 5
        // Helius has generous per-key limits, no 429 cascade like public RPC
        const owner = new PublicKey(wallet);
        const SIG_BATCH_SIZE = 5;

        for (let i = 0; i < ogNfts.length; i += SIG_BATCH_SIZE) {
          const batch = ogNfts.slice(i, i + SIG_BATCH_SIZE);

          await Promise.allSettled(
            batch.map(async (nft) => {
              try {
                const nftMint = new PublicKey(nft.mint);
                const nftAta = getAssociatedTokenAddressSync(nftMint, owner);
                const sigs = await connection.getSignaturesForAddress(nftAta, {
                  limit: 1,
                });
                if (sigs.length > 0 && sigs[0].blockTime) {
                  nft.lastActivityTs = sigs[0].blockTime;
                  nft.lastActivitySig = sigs[0].signature;
                }
              } catch {
                // Skip — activity data is best-effort
              }
            })
          );
        }

        const successCount = ogNfts.filter(
          (n) => n.lastActivityTs != null
        ).length;
        console.log(
          `[helius-adapter] ${successCount}/${ogNfts.length} NFT activity timestamps fetched`
        );

        return ogNfts;
      } catch (err) {
        console.warn(
          `[helius-adapter] getOgNfts failed:`,
          err instanceof Error ? err.message : err
        );
        return [];
      }
    },
  };
}
