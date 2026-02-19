import type { DataAdapter } from "@/lib/types";
import { createRpcAdapter } from "./rpc-adapter";
import { createHeliusAdapter } from "./helius-adapter";

let cachedAdapter: DataAdapter | null = null;

/**
 * Returns the appropriate data adapter based on environment configuration.
 *
 * When a Helius API key is configured, returns a resilient adapter that:
 * 1. Tries every call via Helius first (fast, generous rate limits)
 * 2. Automatically falls back to the free public RPC on any Helius failure
 *    (API down, rate limit exceeded, invalid key, network error)
 *
 * Without a Helius key, returns the free public RPC adapter directly.
 */
export function getDataAdapter(): DataAdapter {
  if (cachedAdapter) return cachedAdapter;

  const rpcUrl =
    process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const heliusApiKey = process.env.HELIUS_API_KEY;

  if (heliusApiKey) {
    const helius = createHeliusAdapter(heliusApiKey, rpcUrl);
    const freeRpc = createRpcAdapter(rpcUrl);
    cachedAdapter = createFallbackAdapter(helius, freeRpc);
  } else {
    cachedAdapter = createRpcAdapter(rpcUrl);
  }

  return cachedAdapter;
}

/**
 * Wraps a primary adapter with automatic fallback to a secondary adapter.
 * Every method call tries primary first; on ANY error, retries with secondary.
 *
 * @param primary - Preferred adapter (e.g. Helius)
 * @param fallback - Fallback adapter (e.g. free public RPC)
 */
function createFallbackAdapter(
  primary: DataAdapter,
  fallback: DataAdapter
): DataAdapter {
  return {
    async getBalance(wallet) {
      try {
        return await primary.getBalance(wallet);
      } catch (err) {
        logFallback("getBalance", err);
        return fallback.getBalance(wallet);
      }
    },

    async getTokenEvents(wallet, startTime, endTime) {
      try {
        return await primary.getTokenEvents(wallet, startTime, endTime);
      } catch (err) {
        logFallback("getTokenEvents", err);
        return fallback.getTokenEvents(wallet, startTime, endTime);
      }
    },

    async getOgNfts(wallet) {
      try {
        return await primary.getOgNfts(wallet);
      } catch (err) {
        logFallback("getOgNfts", err);
        return fallback.getOgNfts(wallet);
      }
    },
  };
}

/**
 * Logs a fallback event for observability.
 */
function logFallback(method: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(
    `[adapter] Helius ${method} failed, falling back to free RPC: ${msg}`
  );
}

// Re-export validation for server-side code that already imports from here
export { isValidSolanaAddress } from "./validation";
