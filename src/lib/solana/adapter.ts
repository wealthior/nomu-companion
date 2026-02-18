import type { DataAdapter } from "@/lib/types";
import { createRpcAdapter } from "./rpc-adapter";
import { createHeliusAdapter } from "./helius-adapter";

let cachedAdapter: DataAdapter | null = null;

/**
 * Returns the appropriate data adapter based on environment configuration.
 * Prefers Helius adapter when API key is available, falls back to RPC.
 */
export function getDataAdapter(): DataAdapter {
  if (cachedAdapter) return cachedAdapter;

  const rpcUrl =
    process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const heliusApiKey = process.env.HELIUS_API_KEY;

  if (heliusApiKey) {
    cachedAdapter = createHeliusAdapter(heliusApiKey, rpcUrl);
  } else {
    cachedAdapter = createRpcAdapter(rpcUrl);
  }

  return cachedAdapter;
}

// Re-export validation for server-side code that already imports from here
export { isValidSolanaAddress } from "./validation";
