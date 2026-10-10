import { describe, expect, it } from "vitest";
import { OLD_ADDRESSES } from "./old-addresses";

describe("the addresses of the old Hub", () => {
  it("each have one answer", () => {
    const sources = OLD_ADDRESSES.map((a) => a.source);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it("never take an address that this Hub uses", () => {
    const own = ["/", "/papers", "/about", "/privacy", "/search", "/saved", "/parallels", "/emails", "/auth/callback", "/api/auth/start"];
    for (const { source } of OLD_ADDRESSES) expect(own).not.toContain(source);
    expect(OLD_ADDRESSES.some((a) => a.source.startsWith("/auth/:") || a.source === "/auth/:path*")).toBe(false);
  });

  it("go to a page of this Hub, and an answer that can change is not permanent", () => {
    for (const { destination } of OLD_ADDRESSES) expect(["/", "/:path*", "/saved", "/papers", "/papers/:paper", "/privacy", "/emails", "/about"]).toContain(destination);
    for (const a of OLD_ADDRESSES.filter((a) => ["/about", "/emails"].includes(a.destination))) expect(a.permanent).toBe(false);
  });
});
