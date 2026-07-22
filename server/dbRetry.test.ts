import { describe, it, expect, vi } from "vitest";
import { withDbRetry } from "./dbRetry";

describe("withDbRetry", () => {
  it("returns result on first successful attempt", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withDbRetry(fn, "test op");
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient error and succeeds on second attempt", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("EPIPE: broken pipe"))
      .mockResolvedValue("recovered");
    
    const result = await withDbRetry(fn, "test op");
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries up to 3 times and throws on exhaustion", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Connection timeout"));
    
    await expect(withDbRetry(fn, "test op")).rejects.toThrow("Connection timeout");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry on non-transient errors (SQL syntax)", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("ER_PARSE_ERROR: You have an error in your SQL syntax"));
    
    await expect(withDbRetry(fn, "test op")).rejects.toThrow("ER_PARSE_ERROR");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on duplicate key errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("ER_DUP_ENTRY: Duplicate entry '1' for key 'PRIMARY'"));
    
    await expect(withDbRetry(fn, "test op")).rejects.toThrow("ER_DUP_ENTRY");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on unknown column errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("ER_BAD_FIELD_ERROR: Unknown column 'foo'"));
    
    await expect(withDbRetry(fn, "test op")).rejects.toThrow("ER_BAD_FIELD_ERROR");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on connection reset errors", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValue("finally");
    
    const result = await withDbRetry(fn, "test op");
    expect(result).toBe("finally");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("retries on 'Failed query' Drizzle errors", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("Failed query: SELECT * FROM senate_races"))
      .mockResolvedValue([{ id: 1 }]);
    
    const result = await withDbRetry(fn, "test op");
    expect(result).toEqual([{ id: 1 }]);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
