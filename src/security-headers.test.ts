import { describe, expect, it } from "vitest";
import { securityHeaders } from "./security-headers";

const get = (dev: boolean) =>
  Object.fromEntries(securityHeaders({ dev, posthogHost: "https://us.i.posthog.com" }).map((h) => [h.key, h.value]));

describe("securityHeaders", () => {
  it("sets the fixed headers", () => {
    const headers = get(false);
    expect(headers["Strict-Transport-Security"]).toBe("max-age=63072000; includeSubDomains");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Permissions-Policy"]).toBe("camera=(), microphone=(), geolocation=(), browsing-topics=()");
  });

  it("limits the content sources", () => {
    const csp = get(false)["Content-Security-Policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self' https://us.i.posthog.com");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("permits eval only in development", () => {
    expect(get(true)["Content-Security-Policy"]).toContain("'unsafe-eval'");
  });
});
