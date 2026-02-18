import { describe, it, expect } from "vitest";
import { isValidSolanaAddress } from "./validation";

describe("isValidSolanaAddress", () => {
  it("accepts valid Solana address", () => {
    expect(
      isValidSolanaAddress("NomuBwKJEvJ8d4dsaq7NZoHaXWXzKcfke1c7Y8ruFYL")
    ).toBe(true);
  });

  it("accepts typical wallet address", () => {
    expect(
      isValidSolanaAddress("11111111111111111111111111111111")
    ).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidSolanaAddress("")).toBe(false);
  });

  it("rejects too short string", () => {
    expect(isValidSolanaAddress("abc")).toBe(false);
  });

  it("rejects string with invalid characters", () => {
    expect(
      isValidSolanaAddress("NomuBwKJEvJ8d4dsaq7NZoHaXWX0OIl")
    ).toBe(false); // contains 0, O, I, l which are not in base58
  });

  it("rejects non-string input", () => {
    expect(isValidSolanaAddress(123 as unknown as string)).toBe(false);
    expect(isValidSolanaAddress(null as unknown as string)).toBe(false);
  });
});
