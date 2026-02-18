import {
  Connection,
  PublicKey,
  type ParsedTransactionWithMeta,
  type ConfirmedSignatureInfo,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { NOMU_MINT, NOMU_OG_NFT_COLLECTION_NAME, NOMU_NFT_EXCLUDE_PATTERNS } from "@/lib/constants";
import type { DataAdapter, TokenEvent, OgNftInfo } from "@/lib/types";

/** Metaplex Token Metadata Program ID */
const METAPLEX_METADATA_PROGRAM = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

/**
 * Delay helper to avoid hammering the public RPC.
 * @param ms - Milliseconds to wait
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an async operation with exponential backoff.
 * Handles 429 (rate-limit) responses from the Solana public RPC.
 * @param fn - Async function to retry
 * @param retries - Max number of retries (default 5)
 * @param baseDelay - Initial delay in ms (default 1000)
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 5,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes("429");
      const isLastAttempt = attempt === retries;

      if (isLastAttempt || !is429) {
        throw err;
      }

      // Jitter: add 0-200ms random to avoid thundering herd
      const jitter = Math.floor(Math.random() * 200);
      const waitMs = baseDelay * Math.pow(2, attempt) + jitter;
      console.warn(
        `[rpc-adapter] 429 rate-limited, retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})`
      );
      await delay(waitMs);
    }
  }
  throw new Error("withRetry: unreachable");
}

/** Max signature batches to fetch from public RPC */
const MAX_SIGNATURE_BATCHES = 2;
/** Signatures per batch */
const SIGNATURES_PER_BATCH = 25;
/**
 * Delay between sequential RPC calls (ms).
 * 600ms keeps us safely under the ~10 req/s public Solana RPC limit.
 */
const INTER_REQUEST_DELAY_MS = 600;

/**
 * Solana RPC adapter for fetching on-chain data.
 * Uses standard Solana RPC calls with heuristic buy/sell detection.
 *
 * Uses `getParsedTransaction` (singular, one at a time) because the batched
 * `getParsedTransactions` counts as N requests server-side and triggers 429
 * on the public RPC even with small batch sizes.
 */
export function createRpcAdapter(rpcUrl: string): DataAdapter {
  const connection = new Connection(rpcUrl, {
    commitment: "confirmed",
    // Disable the built-in retry on 429 — we handle retries ourselves
    disableRetryOnRateLimit: true,
  });
  const nomuMint = new PublicKey(NOMU_MINT);

  return {
    async getBalance(wallet: string): Promise<number> {
      const owner = new PublicKey(wallet);
      const ata = getAssociatedTokenAddressSync(nomuMint, owner);

      try {
        const balance = await withRetry(() =>
          connection.getTokenAccountBalance(ata)
        );
        return Number(balance.value.uiAmount ?? 0);
      } catch {
        // Token account may not exist
        return 0;
      }
    },

    async getTokenEvents(
      wallet: string,
      startTime?: number,
      endTime?: number
    ): Promise<TokenEvent[]> {
      const owner = new PublicKey(wallet);
      const ata = getAssociatedTokenAddressSync(nomuMint, owner);

      const signatures: ConfirmedSignatureInfo[] = [];
      let before: string | undefined;

      // Fetch signatures in small batches
      for (let i = 0; i < MAX_SIGNATURE_BATCHES; i++) {
        if (i > 0) await delay(INTER_REQUEST_DELAY_MS);

        const batch = await withRetry(() =>
          connection.getSignaturesForAddress(ata, {
            limit: SIGNATURES_PER_BATCH,
            before,
          })
        );
        if (batch.length === 0) break;
        signatures.push(...batch);
        before = batch[batch.length - 1].signature;

        // Stop if we've gone past the start time
        if (
          startTime &&
          batch[batch.length - 1].blockTime &&
          batch[batch.length - 1].blockTime! < startTime
        ) {
          break;
        }
      }

      // Filter signatures within time range before fetching full transactions
      const relevantSigs = signatures.filter((sig) => {
        if (!sig.blockTime) return false;
        if (startTime && sig.blockTime < startTime) return false;
        if (endTime && sig.blockTime > endTime) return false;
        return true;
      });

      const events: TokenEvent[] = [];

      // Parse transactions ONE BY ONE using getParsedTransaction (singular).
      // The batched getParsedTransactions counts as N requests server-side
      // and triggers per-method 429 on the public Solana RPC.
      for (let i = 0; i < relevantSigs.length; i++) {
        if (i > 0) await delay(INTER_REQUEST_DELAY_MS);

        const sig = relevantSigs[i];
        const tx = await withRetry(() =>
          connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          })
        );

        if (!tx || !sig.blockTime) continue;

        const event = parseTokenEvent(tx, sig.signature, sig.blockTime, wallet);
        if (event) {
          events.push(event);
        }
      }

      return events.sort((a, b) => a.timestamp - b.timestamp);
    },

    async getOgNfts(wallet: string): Promise<OgNftInfo[]> {
      try {
        const owner = new PublicKey(wallet);

        // Fetch all token accounts owned by this wallet
        const tokenAccounts = await withRetry(() =>
          connection.getParsedTokenAccountsByOwner(owner, {
            programId: TOKEN_PROGRAM_ID,
          })
        );

        // Filter for NFTs: decimals === 0 (include zero-balance = previously sold)
        const nftMints: { mint: string; held: boolean }[] = [];
        for (const account of tokenAccounts.value) {
          const info = account.account.data.parsed?.info;
          if (!info) continue;
          const decimals = info.tokenAmount?.decimals ?? -1;
          const amount = Number(info.tokenAmount?.uiAmount ?? 0);
          if (decimals === 0) {
            nftMints.push({ mint: info.mint, held: amount >= 1 });
          }
        }

        if (nftMints.length === 0) return [];

        // Derive all Metaplex Metadata PDAs upfront
        const pdaEntries = nftMints.map(({ mint, held }) => {
          const mintPubkey = new PublicKey(mint);
          const [pda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("metadata"),
              METAPLEX_METADATA_PROGRAM.toBuffer(),
              mintPubkey.toBuffer(),
            ],
            METAPLEX_METADATA_PROGRAM
          );
          return { mint, held, pda };
        });

        // Fetch ALL metadata accounts in batches using getMultipleAccountsInfo
        const MULTI_ACCOUNT_BATCH = 50;
        const ogNfts: OgNftInfo[] = [];

        for (let i = 0; i < pdaEntries.length; i += MULTI_ACCOUNT_BATCH) {
          if (i > 0) await delay(INTER_REQUEST_DELAY_MS);

          const batch = pdaEntries.slice(i, i + MULTI_ACCOUNT_BATCH);
          const pdaKeys = batch.map((e) => e.pda);

          const accountInfos = await withRetry(() =>
            connection.getMultipleAccountsInfo(pdaKeys)
          );

          for (let j = 0; j < batch.length; j++) {
            const accountInfo = accountInfos[j];
            if (!accountInfo?.data) continue;

            const parsed = parseMetaplexAccount(accountInfo.data, batch[j].mint, batch[j].held);
            if (parsed) {
              ogNfts.push(parsed);
            }
          }
        }

        // Run image resolution (HTTP to Arweave/Irys, NOT Solana RPC) and
        // signature lookups (Solana RPC) in PARALLEL. Image resolution uses
        // different servers, giving the Solana RPC time to recover.
        const [resolved, activityMap] = await Promise.all([
          resolveNftImages(ogNfts),
          fetchNftActivityTimestamps(ogNfts, owner, connection),
        ]);

        // Merge activity data into resolved NFTs
        return resolved.map((nft) => {
          const activity = activityMap.get(nft.mint);
          if (activity) {
            return { ...nft, ...activity };
          }
          return nft;
        });
      } catch (err) {
        console.warn(
          `[rpc-adapter] Failed to fetch OG NFTs:`,
          err instanceof Error ? err.message : err
        );
        return [];
      }
    },
  };
}

/**
 * Parses a transaction to extract NOMU token balance changes for a specific wallet.
 * @param tx - Parsed transaction from RPC
 * @param signature - Transaction signature
 * @param blockTime - Unix timestamp of the block
 * @param walletAddress - The wallet address to track balance changes for
 */
function parseTokenEvent(
  tx: ParsedTransactionWithMeta,
  signature: string,
  blockTime: number,
  walletAddress: string
): TokenEvent | null {
  if (!tx.meta) return null;

  const preBalances = tx.meta.preTokenBalances ?? [];
  const postBalances = tx.meta.postTokenBalances ?? [];

  // Find NOMU token balance changes for this wallet's address
  const preBal = preBalances.find(
    (b) => b.mint === NOMU_MINT && b.owner === walletAddress
  );
  const postBal = postBalances.find(
    (b) => b.mint === NOMU_MINT && b.owner === walletAddress
  );

  const preAmount = Number(preBal?.uiTokenAmount?.uiAmount ?? 0);
  const postAmount = Number(postBal?.uiTokenAmount?.uiAmount ?? 0);
  const delta = postAmount - preAmount;

  if (Math.abs(delta) < 0.000001) return null;

  // Heuristic: positive delta = buy, negative delta = sell
  const type = delta > 0 ? "buy" : delta < 0 ? "sell" : "unknown";

  // Confidence based on whether we can see SOL/USDC counter-flow
  const hasSolChange =
    tx.meta.preBalances &&
    tx.meta.postBalances &&
    tx.meta.preBalances.some(
      (pre, idx) => Math.abs(pre - (tx.meta!.postBalances[idx] ?? pre)) > 10000
    );

  const confidence = hasSolChange ? "medium" : "low";

  return {
    signature,
    timestamp: blockTime,
    deltaAmount: delta,
    postBalance: postAmount,
    confidence: type === "unknown" ? "unknown" : confidence,
    type,
  };
}

/**
 * Parses a Metaplex Metadata account's raw binary data.
 * Returns OgNftInfo if the name contains "nomu" (case-insensitive), otherwise null.
 * @param data - Raw account data buffer
 * @param mint - The mint address string
 * @param held - Whether the wallet currently holds this NFT
 */
function parseMetaplexAccount(
  data: Buffer,
  mint: string,
  held: boolean
): OgNftInfo | null {
  // Layout: key(1) + update_authority(32) + mint(32) + name(4+MAX_NAME_LENGTH)
  // name starts at offset 1 + 32 + 32 = 65, prefixed by 4-byte length
  if (data.length < 69) return null;

  const nameLen = data.readUInt32LE(65);
  const safeLen = Math.min(nameLen, 32);
  const nameRaw = data.subarray(69, 69 + safeLen);
  // Name is null-padded, trim trailing zeros
  const name = Buffer.from(nameRaw).toString("utf8").replace(/\0+$/, "").trim();

  // Check if this NFT is Nomu-related
  const nameLower = name.toLowerCase();
  if (!nameLower.includes(NOMU_OG_NFT_COLLECTION_NAME)) {
    return null;
  }

  // Exclude non-OG NFTs (e.g. "NOMU Liquidity Provider")
  const isExcluded = NOMU_NFT_EXCLUDE_PATTERNS.some((pattern) =>
    nameLower.includes(pattern)
  );
  if (isExcluded) {
    return null;
  }

  // Try to extract URI for image
  // URI follows: name(4+MAX_NAME_LENGTH=32) + symbol(4+MAX_SYMBOL_LENGTH=10) + uri(4+MAX_URI_LENGTH=200)
  let metadataUri = "";
  const symbolOffset = 69 + 32; // after name
  if (data.length > symbolOffset + 4) {
    const symbolLen = data.readUInt32LE(symbolOffset);
    const safeSymbolLen = Math.min(symbolLen, 10);
    const uriOffset = symbolOffset + 4 + safeSymbolLen;
    if (data.length > uriOffset + 4) {
      const uriLen = data.readUInt32LE(uriOffset);
      const safeUriLen = Math.min(uriLen, 200);
      if (data.length >= uriOffset + 4 + safeUriLen) {
        const uriRaw = data.subarray(uriOffset + 4, uriOffset + 4 + safeUriLen);
        metadataUri = Buffer.from(uriRaw).toString("utf8").replace(/\0+$/, "").trim();
      }
    }
  }

  return {
    mint,
    name,
    image: metadataUri, // This is the JSON metadata URI; will be resolved later
    held,
    lastActivityTs: null,
    lastActivitySig: null,
  };
}

/**
 * Resolves off-chain JSON metadata URIs to actual image URLs.
 * Fetches the JSON from Arweave/Irys/IPFS and extracts the `image` field.
 * @param nfts - Array of OgNftInfo with metadata URIs in the image field
 * @returns Array of OgNftInfo with resolved image URLs
 */
async function resolveNftImages(nfts: OgNftInfo[]): Promise<OgNftInfo[]> {
  if (nfts.length === 0) return [];

  const RESOLVE_BATCH_SIZE = 10;
  const results: OgNftInfo[] = [];

  for (let i = 0; i < nfts.length; i += RESOLVE_BATCH_SIZE) {
    const batch = nfts.slice(i, i + RESOLVE_BATCH_SIZE);
    const resolved = await Promise.allSettled(
      batch.map(async (nft) => {
        if (!nft.image || !nft.image.startsWith("http")) {
          return nft;
        }

        try {
          const res = await fetch(nft.image, {
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok) return nft;

          const json = await res.json();
          const imageUrl =
            json.image ??
            json.properties?.files?.[0]?.uri ??
            "";

          return { ...nft, image: imageUrl };
        } catch {
          // If fetching metadata fails, keep the original URI
          return nft;
        }
      })
    );

    for (const result of resolved) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }
  }

  return results;
}

/**
 * Fetches last activity timestamps for OG NFTs via sequential signature lookups.
 * Designed to run IN PARALLEL with resolveNftImages (which uses HTTP, not RPC),
 * giving the Solana RPC more breathing room.
 *
 * Uses adaptive delay with fail-fast on consecutive 429s:
 *   - 800ms between successful calls
 *   - 2000ms backoff after a 429
 *   - Aborts after 5 consecutive 429s
 *   - Total time budget of 35s
 *
 * @param ogNfts - OG NFTs to fetch activity for
 * @param owner - Wallet owner PublicKey
 * @param connection - Solana RPC connection
 * @returns Map of mint → { lastActivityTs, lastActivitySig }
 */
async function fetchNftActivityTimestamps(
  ogNfts: OgNftInfo[],
  owner: PublicKey,
  connection: Connection
): Promise<Map<string, { lastActivityTs: number; lastActivitySig: string }>> {
  const activityMap = new Map<string, { lastActivityTs: number; lastActivitySig: string }>();

  if (ogNfts.length === 0) return activityMap;

  const NFT_SIG_MIN_DELAY_MS = 800;
  const NFT_SIG_BACKOFF_DELAY_MS = 2000;
  const NFT_SIG_TOTAL_BUDGET_MS = 35_000;
  const MAX_CONSECUTIVE_429 = 5;
  const sigStartTime = Date.now();
  let consecutive429s = 0;
  let currentDelay = NFT_SIG_MIN_DELAY_MS;
  let successCount = 0;

  for (let i = 0; i < ogNfts.length; i++) {
    // Abort if we've exceeded the time budget
    if (Date.now() - sigStartTime > NFT_SIG_TOTAL_BUDGET_MS) {
      console.warn(
        `[rpc-adapter] NFT activity lookup budget exhausted after ${i}/${ogNfts.length} NFTs (${successCount} succeeded)`
      );
      break;
    }

    // Abort if too many consecutive 429 errors (RPC is saturated)
    if (consecutive429s >= MAX_CONSECUTIVE_429) {
      console.warn(
        `[rpc-adapter] ${MAX_CONSECUTIVE_429} consecutive 429s, aborting NFT lookups after ${i}/${ogNfts.length} (${successCount} succeeded)`
      );
      break;
    }

    if (i > 0) await delay(currentDelay);

    const nft = ogNfts[i];
    try {
      const nftMint = new PublicKey(nft.mint);
      const nftAta = getAssociatedTokenAddressSync(nftMint, owner);

      const sigs = await withRetry(
        () => connection.getSignaturesForAddress(nftAta, { limit: 1 }),
        1, // Single retry — fail fast to preserve budget
        1000
      );

      if (sigs.length > 0 && sigs[0].blockTime) {
        activityMap.set(nft.mint, {
          lastActivityTs: sigs[0].blockTime,
          lastActivitySig: sigs[0].signature,
        });
        successCount++;
      }
      // Success: reset backoff state
      consecutive429s = 0;
      currentDelay = NFT_SIG_MIN_DELAY_MS;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("429")) {
        consecutive429s++;
        currentDelay = NFT_SIG_BACKOFF_DELAY_MS;
      }
      // Silently skip — activity data is best-effort
    }
  }

  if (successCount === ogNfts.length) {
    console.log(
      `[rpc-adapter] All ${ogNfts.length} NFT activity lookups completed successfully`
    );
  } else if (successCount > 0) {
    console.log(
      `[rpc-adapter] ${successCount}/${ogNfts.length} NFT activity lookups succeeded`
    );
  }

  return activityMap;
}
