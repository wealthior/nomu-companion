import type { OgNftInfo } from "@/lib/types";

/**
 * Magic Eden activity entry (subset of fields we need).
 */
interface MagicEdenActivity {
  signature: string;
  type: string;
  tokenMint: string;
  collection: string;
  blockTime: number;
  buyer: string;
  seller: string;
}

/**
 * Discovers sold NOMU OG NFTs via the Magic Eden API.
 *
 * When an NFT is sold on a marketplace and the token account is closed,
 * `getParsedTokenAccountsByOwner` can no longer see it. The Magic Eden API
 * records all marketplace activity and allows us to find NFTs the wallet
 * has sold.
 *
 * This is a single HTTP call (no Solana RPC budget consumed).
 *
 * @param wallet - Wallet address
 * @param knownMints - Set of mints already known from RPC (currently held)
 * @returns Array of sold OgNftInfo entries with activity timestamps
 */
export async function discoverSoldNfts(
  wallet: string,
  knownMints: Set<string>
): Promise<OgNftInfo[]> {
  try {
    const url = new URL(
      `https://api-mainnet.magiceden.dev/v2/wallets/${wallet}/activities`
    );
    url.searchParams.set("offset", "0");
    url.searchParams.set("limit", "500");

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.warn(
        `[nft-sold-discovery] Magic Eden API returned ${res.status}`
      );
      return [];
    }

    const activities: MagicEdenActivity[] = await res.json();

    // Find activities where this wallet was the SELLER of a nomu_og NFT
    // and the mint is NOT in the currently-held set
    const soldNfts: OgNftInfo[] = [];
    const seenMints = new Set<string>();

    for (const activity of activities) {
      // Only care about nomu_og collection
      if (!activity.collection?.toLowerCase().includes("nomu")) continue;

      // Only care about sales where this wallet was the seller
      if (activity.seller !== wallet) continue;

      // Skip if already known (still held) or already found
      if (knownMints.has(activity.tokenMint)) continue;
      if (seenMints.has(activity.tokenMint)) continue;
      seenMints.add(activity.tokenMint);

      soldNfts.push({
        mint: activity.tokenMint,
        name: "", // Will be resolved via metadata later
        image: "",
        held: false,
        lastActivityTs: activity.blockTime,
        lastActivitySig: activity.signature,
      });
    }

    if (soldNfts.length > 0) {
      console.log(
        `[nft-sold-discovery] Found ${soldNfts.length} sold NOMU OG NFT(s) via Magic Eden`
      );

      // Resolve names/images for sold NFTs via on-chain metadata
      await resolveMetadataForSoldNfts(soldNfts);
    }

    return soldNfts;
  } catch (err) {
    console.warn(
      `[nft-sold-discovery] Failed:`,
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

/**
 * Resolves on-chain Metaplex metadata (name + image) for sold NFTs.
 * Uses the same Arweave/Irys JSON metadata pattern as the RPC adapter.
 * Fetches the metadata PDA directly (no token account needed).
 *
 * @param nfts - Sold NFTs with empty name/image fields (mutated in place)
 */
async function resolveMetadataForSoldNfts(nfts: OgNftInfo[]): Promise<void> {
  // We need @solana/web3.js for Metaplex PDA derivation.
  // Dynamic import to avoid bundling issues in edge cases.
  const { Connection, PublicKey } = await import("@solana/web3.js");

  const METAPLEX_METADATA_PROGRAM = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  const rpcUrl =
    process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpcUrl, {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
  });

  // Derive PDAs for all sold NFT mints
  const pdas = nfts.map((nft) => {
    const mintPubkey = new PublicKey(nft.mint);
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METAPLEX_METADATA_PROGRAM.toBuffer(),
        mintPubkey.toBuffer(),
      ],
      METAPLEX_METADATA_PROGRAM
    );
    return pda;
  });

  try {
    const accountInfos = await connection.getMultipleAccountsInfo(pdas);

    for (let i = 0; i < nfts.length; i++) {
      const accountInfo = accountInfos[i];
      if (!accountInfo?.data) continue;

      const { name, metadataUri } = parseMetaplexName(accountInfo.data);
      nfts[i].name = name;

      // Resolve image from metadata JSON (Arweave/Irys)
      if (metadataUri) {
        try {
          const jsonRes = await fetch(metadataUri, {
            signal: AbortSignal.timeout(5000),
          });
          if (jsonRes.ok) {
            const json = await jsonRes.json();
            nfts[i].image =
              json.image ?? json.properties?.files?.[0]?.uri ?? "";
          }
        } catch {
          // Keep empty image — best effort
        }
      }
    }
  } catch (err) {
    console.warn(
      `[nft-sold-discovery] Metadata resolution failed:`,
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Minimal Metaplex metadata parser — extracts name and URI from raw account data.
 * @param data - Raw account data buffer
 */
function parseMetaplexName(data: Buffer): {
  name: string;
  metadataUri: string;
} {
  // Layout: key(1) + update_authority(32) + mint(32) + name(4+MAX_NAME_LENGTH)
  if (data.length < 69) return { name: "Unknown NOMU OG", metadataUri: "" };

  const nameLen = data.readUInt32LE(65);
  const safeLen = Math.min(nameLen, 32);
  const nameRaw = data.subarray(69, 69 + safeLen);
  const name = Buffer.from(nameRaw)
    .toString("utf8")
    .replace(/\0+$/, "")
    .trim();

  // Extract URI: after name(4+32) + symbol(4+10)
  let metadataUri = "";
  const symbolOffset = 69 + 32;
  if (data.length > symbolOffset + 4) {
    const symbolLen = data.readUInt32LE(symbolOffset);
    const safeSymbolLen = Math.min(symbolLen, 10);
    const uriOffset = symbolOffset + 4 + safeSymbolLen;
    if (data.length > uriOffset + 4) {
      const uriLen = data.readUInt32LE(uriOffset);
      const safeUriLen = Math.min(uriLen, 200);
      if (data.length >= uriOffset + 4 + safeUriLen) {
        const uriRaw = data.subarray(
          uriOffset + 4,
          uriOffset + 4 + safeUriLen
        );
        metadataUri = Buffer.from(uriRaw)
          .toString("utf8")
          .replace(/\0+$/, "")
          .trim();
      }
    }
  }

  return { name: name || "Unknown NOMU OG", metadataUri };
}
