import { afterEach, describe, expect, it, vi } from "vitest";
import { spanishPrerenderIds } from "./prerender";

describe("spanishPrerenderIds", () => {
  afterEach(() => vi.unstubAllEnvs());
  // Cache Components needs one entry. With the flag off, that one page answers 404.
  it("builds one page that answers 404 while Spanish is off", () => {
    vi.stubEnv("NEXT_PUBLIC_SPANISH", "");
    expect(spanishPrerenderIds()).toEqual(["0"]);
  });
  it("builds the same papers as English while Spanish is on", () => {
    vi.stubEnv("NEXT_PUBLIC_SPANISH", "on");
    vi.stubEnv("PRERENDER_PAPERS", "0,1,2");
    expect(spanishPrerenderIds()).toEqual(["0", "1", "2"]);
  });
});
