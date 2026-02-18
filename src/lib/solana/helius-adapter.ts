import { NOMU_MINT } from "@/lib/constants";
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
 * Falls back to RPC adapter for balance queries.
 */
export function createHeliusAdapter(
  apiKey: string,
  rpcUrl: string
): DataAdapter {
  const rpcAdapter = createRpcAdapter(rpcUrl);
  const baseUrl = `https://api.helius.xyz/v0`;
  const rpcBaseUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

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

    async getOgNfts(wallet: string): Promise<OgNftInfo[]> {
      try {
        const response = await fetch(rpcBaseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "og-nft-check",
            method: "getAssetsByOwner",
            params: {
              ownerAddress: wallet,
              page: 1,
              limit: 100,
            },
          }),
        });

        if (!response.ok) return [];

        const data = await response.json();
        const assets: HeliusAsset[] = data.result?.items ?? [];

        // Filter for NFTs that look like Nomu OG NFTs
        // We check for "nomu" in the name (case-insensitive) or known collection
        return assets
          .filter((asset) => {
            const name = asset.content?.metadata?.name?.toLowerCase() ?? "";
            const isNomuRelated =
              name.includes("nomu") && (name.includes("og") || name.includes("genesis"));
            return isNomuRelated;
          })
          .map((asset) => ({
            mint: asset.id,
            name: asset.content?.metadata?.name ?? "Unknown",
            image:
              asset.content?.links?.image ??
              asset.content?.files?.[0]?.uri ??
              "",
            held: true, // Helius getAssetsByOwner only returns currently-held assets
            lastActivityTs: null,
            lastActivitySig: null,
          }));
      } catch {
        return [];
      }
    },
  };
}
