import { prisma } from "@/lib/db";
import type { OgNftInfo } from "@/lib/types";

/**
 * Loads cached NFT activity data from the database for a wallet.
 * Returns a Map of mint → { lastActivityTs, lastActivitySig, held, name, image }.
 * @param wallet - Wallet address
 */
export async function loadNftActivity(
  wallet: string
): Promise<Map<string, Pick<OgNftInfo, "lastActivityTs" | "lastActivitySig" | "held" | "name" | "image">>> {
  const rows = await prisma.nftActivity.findMany({
    where: { wallet },
  });

  const map = new Map<
    string,
    Pick<OgNftInfo, "lastActivityTs" | "lastActivitySig" | "held" | "name" | "image">
  >();

  for (const row of rows) {
    map.set(row.mint, {
      lastActivityTs: row.lastActivityTs,
      lastActivitySig: row.lastActivitySig,
      held: row.held,
      name: row.name,
      image: row.image,
    });
  }

  return map;
}

/**
 * Persists NFT activity data to the database.
 * Uses upsert to create or update each NFT record.
 * Only writes NFTs that have activity data or whose metadata has changed.
 * @param wallet - Wallet address
 * @param ogNfts - NFTs to persist (from RPC + merged data)
 */
export async function saveNftActivity(
  wallet: string,
  ogNfts: OgNftInfo[]
): Promise<void> {
  if (ogNfts.length === 0) return;

  // Use a transaction for atomic batch upsert
  await prisma.$transaction(
    ogNfts.map((nft) =>
      prisma.nftActivity.upsert({
        where: {
          wallet_mint: { wallet, mint: nft.mint },
        },
        create: {
          wallet,
          mint: nft.mint,
          name: nft.name,
          image: nft.image,
          held: nft.held,
          lastActivityTs: nft.lastActivityTs,
          lastActivitySig: nft.lastActivitySig,
        },
        update: {
          name: nft.name,
          image: nft.image,
          held: nft.held,
          // Only overwrite activity data if we have newer info
          ...(nft.lastActivityTs != null
            ? {
                lastActivityTs: nft.lastActivityTs,
                lastActivitySig: nft.lastActivitySig,
              }
            : {}),
        },
      })
    )
  );
}

/**
 * Merges RPC-fetched NFT data with DB-cached activity timestamps.
 *
 * Two merge directions:
 * 1. RPC → DB: Fill in timestamps that RPC couldn't fetch (429'd)
 * 2. DB → RPC: Resurrect sold NFTs whose token accounts were closed
 *    (invisible to `getTokenAccountsByOwner` but remembered in DB)
 *
 * @param rpcNfts - NFTs from the RPC adapter (may have incomplete activity data)
 * @param dbCache - Cached activity data from DB
 * @returns Merged NFTs with best available activity data, including sold NFTs
 */
export function mergeNftActivity(
  rpcNfts: OgNftInfo[],
  dbCache: Map<string, Pick<OgNftInfo, "lastActivityTs" | "lastActivitySig" | "held" | "name" | "image">>
): OgNftInfo[] {
  // Track which mints we've seen from RPC
  const rpcMints = new Set(rpcNfts.map((n) => n.mint));

  // Merge RPC NFTs with DB timestamps
  const merged = rpcNfts.map((nft) => {
    // If RPC already has activity data, use it (it's the freshest)
    if (nft.lastActivityTs != null) return nft;

    // Otherwise, fill in from DB cache
    const cached = dbCache.get(nft.mint);
    if (cached?.lastActivityTs != null) {
      return {
        ...nft,
        lastActivityTs: cached.lastActivityTs,
        lastActivitySig: cached.lastActivitySig,
      };
    }

    return nft;
  });

  // Resurrect sold NFTs: DB entries not found in RPC = token account closed = sold
  for (const [mint, data] of dbCache.entries()) {
    if (rpcMints.has(mint)) continue; // Already in RPC results

    // This NFT was previously known but is now gone from the wallet.
    // Mark as held=false (disposed/sold).
    merged.push({
      mint,
      name: data.name,
      image: data.image,
      held: false,
      lastActivityTs: data.lastActivityTs,
      lastActivitySig: data.lastActivitySig,
    });
  }

  return merged;
}
