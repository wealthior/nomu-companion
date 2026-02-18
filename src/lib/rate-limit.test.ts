import { describe, it, expect } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows first request", () => {
    const result = checkRateLimit("test-ip-unique-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("tracks request count", () => {
    const key = "test-ip-unique-2";
    const first = checkRateLimit(key);
    const second = checkRateLimit(key);
    expect(second.remaining).toBe(first.remaining - 1);
  });

  it("blocks after exceeding limit", () => {
    const key = "test-ip-unique-3";
    // Exhaust the limit
    for (let i = 0; i < 30; i++) {
      checkRateLimit(key);
    }
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
