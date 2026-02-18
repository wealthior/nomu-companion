import { describe, it, expect, beforeEach } from "vitest";
import { cached, clearCache } from "./cache";

beforeEach(() => {
  clearCache();
});

describe("cached", () => {
  it("calls fetcher on cache miss", async () => {
    let callCount = 0;
    const result = await cached("test-key", 10000, async () => {
      callCount++;
      return 42;
    });
    expect(result).toBe(42);
    expect(callCount).toBe(1);
  });

  it("returns cached value on cache hit", async () => {
    let callCount = 0;
    const fetcher = async () => {
      callCount++;
      return "hello";
    };

    await cached("key", 10000, fetcher);
    const result = await cached("key", 10000, fetcher);
    expect(result).toBe("hello");
    expect(callCount).toBe(1);
  });

  it("refetches after TTL expires", async () => {
    let callCount = 0;
    const fetcher = async () => {
      callCount++;
      return callCount;
    };

    // Use a 1ms TTL
    await cached("ttl-key", 1, fetcher);
    // Wait a bit
    await new Promise((r) => setTimeout(r, 10));
    const result = await cached("ttl-key", 1, fetcher);
    expect(result).toBe(2);
    expect(callCount).toBe(2);
  });

  it("caches different keys independently", async () => {
    await cached("a", 10000, async () => "value-a");
    await cached("b", 10000, async () => "value-b");

    const a = await cached("a", 10000, async () => "should-not-call");
    const b = await cached("b", 10000, async () => "should-not-call");
    expect(a).toBe("value-a");
    expect(b).toBe("value-b");
  });
});
