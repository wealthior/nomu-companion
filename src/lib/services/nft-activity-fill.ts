import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { loadNftActivity, saveNftActivity } from "@/lib/services/nft-activity-store";
import { invalidateCache } from "@/lib/cache";
import type { OgNftInfo } from "@/lib/types";

/**
 * Delay helper.
 * @param ms - Milliseconds to wait
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fills in missing NFT activity timestamps by querying the Solana RPC
 * at a gentle pace. Designed to run AFTER the main profile has loaded
 * (simulation is cached, freeing up RPC budget).
 *
 * Strategy:
 * - Load existing activity from DB
 * - For NFTs without timestamps, fetch signatures one by one
 * - Use generous delays (1200ms) to avoid 429s
 * - Persist each discovered timestamp immediately
 * - Invalidate the in-memory cache so the next page load has full data
 *
 * @param wallet - Wallet address
 * @returns Stats about the fill operation
 */
export async function fillMissingNftActivity(
  wallet: string
): Promise<{ total: number; filled: number; alreadyComplete: boolean }> {
  const rpcUrl =
    process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpcUrl, {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
  });

  const owner = new PublicKey(wallet);

  // Load what we already know from DB
  const dbCache = await loadNftActivity(wallet);

  if (dbCache.size === 0) {
    // No NFTs in DB yet — the main profile hasn't been fetched yet
    return { total: 0, filled: 0, alreadyComplete: true };
  }

  // Find NFTs missing activity timestamps
  const missing: { mint: string; name: string; image: string; held: boolean }[] = [];
  for (const [mint, data] of dbCache.entries()) {
    if (data.lastActivityTs == null) {
      missing.push({ mint, name: data.name, image: data.image, held: data.held });
    }
  }

  if (missing.length === 0) {
    return { total: dbCache.size, filled: 0, alreadyComplete: true };
  }

  console.log(
    `[nft-activity-fill] Filling ${missing.length}/${dbCache.size} missing timestamps for ${wallet.slice(0, 8)}...`
  );

  const FILL_DELAY_MS = 1200;
  const FILL_BACKOFF_MS = 2500;
  const MAX_CONSECUTIVE_429 = 3;
  let consecutive429s = 0;
  let filled = 0;
  const newlyDiscovered: OgNftInfo[] = [];

  // Wait a moment to let the RPC recover from the main profile fetch
  await delay(2000);

  for (let i = 0; i < missing.length; i++) {
    if (consecutive429s >= MAX_CONSECUTIVE_429) {
      console.warn(
        `[nft-activity-fill] ${MAX_CONSECUTIVE_429} consecutive 429s, stopping after ${filled}/${missing.length}`
      );
      break;
    }

    if (i > 0) await delay(consecutive429s > 0 ? FILL_BACKOFF_MS : FILL_DELAY_MS);

    const { mint, name, image, held } = missing[i];
    try {
      const nftMint = new PublicKey(mint);
      const nftAta = getAssociatedTokenAddressSync(nftMint, owner);

      const sigs = await connection.getSignaturesForAddress(nftAta, { limit: 1 });

      if (sigs.length > 0 && sigs[0].blockTime) {
        const nftData: OgNftInfo = {
          mint,
          name,
          image,
          held,
          lastActivityTs: sigs[0].blockTime,
          lastActivitySig: sigs[0].signature,
        };
        newlyDiscovered.push(nftData);
        filled++;
        consecutive429s = 0;
      } else {
        consecutive429s = 0;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("429")) {
        consecutive429s++;
      }
      // Silently skip — best effort
    }
  }

  // Persist newly discovered timestamps to DB
  if (newlyDiscovered.length > 0) {
    try {
      await saveNftActivity(wallet, newlyDiscovered);
      // Invalidate in-memory cache so next page load picks up the new data
      invalidateCache(`og:${wallet}`);
      console.log(
        `[nft-activity-fill] Saved ${newlyDiscovered.length} new timestamps for ${wallet.slice(0, 8)}...`
      );
    } catch (err) {
      console.warn(
        `[nft-activity-fill] Failed to save:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  const isComplete = filled === missing.length;
  return { total: dbCache.size, filled, alreadyComplete: isComplete };
}
