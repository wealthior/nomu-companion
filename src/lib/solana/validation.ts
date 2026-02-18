/**
 * Validates a Solana wallet address (Base58, 32-44 chars).
 * This module is safe for client-side use — no Node.js dependencies.
 */
export function isValidSolanaAddress(address: string): boolean {
  if (typeof address !== "string") return false;
  if (address.length < 32 || address.length > 44) return false;
  // Base58 character set (no 0, O, I, l)
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

/**
 * Shortens a wallet address for display: "Abcd...wxyz"
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
