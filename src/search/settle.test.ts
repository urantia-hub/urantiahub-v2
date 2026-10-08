import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { settle } from "./settle";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("settle", () => {
  it("gives the value of a search that ends", async () => {
    await expect(settle(Promise.resolve({ hits: [], total: 0 }))).resolves.toEqual({ ok: true, page: { hits: [], total: 0 } });
  });
  it("gives a failure for a search that throws, and never throws itself", async () => {
    await expect(settle(Promise.reject(new Error("500")))).resolves.toEqual({ ok: false });
  });
  // A hung search must not hold the other group on grey rows.
  it("gives a failure for a search that does not end in time", async () => {
    const never = new Promise<{ hits: []; total: number }>(() => {});
    const outcome = settle(never, 8000);
    await vi.advanceTimersByTimeAsync(8000);
    await expect(outcome).resolves.toEqual({ ok: false });
  });
  it("does not fail a search that ends just in time", async () => {
    const slow = new Promise<{ hits: []; total: number }>((resolve) => setTimeout(() => resolve({ hits: [], total: 3 }), 7000));
    const outcome = settle(slow, 8000);
    await vi.advanceTimersByTimeAsync(7000);
    await expect(outcome).resolves.toEqual({ ok: true, page: { hits: [], total: 3 } });
  });
});
