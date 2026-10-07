import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

function run(path: string) {
  return proxy(new NextRequest(new URL(path, "https://next.urantiahub.com")));
}

describe("proxy", () => {
  it("lets the canonical URL through", () => {
    const res = run("/papers/paper-1-the-universal-father");
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it.each([
    ["/papers/1", "/papers/paper-1-the-universal-father"],
    ["/papers/paper-1", "/papers/paper-1-the-universal-father"],
    ["/papers/paper-1-an-old-title", "/papers/paper-1-the-universal-father"],
    ["/papers/0", "/papers/foreword"],
    // Review Focus 2: a messaging app or a person changed the case.
    ["/papers/Paper-1-The-Universal-Father", "/papers/paper-1-the-universal-father"],
    ["/papers/FOREWORD", "/papers/foreword"],
  ])("redirects %s to %s with 308", (from, to) => {
    const res = run(from);
    expect(res.status).toBe(308);
    expect(new URL(res.headers.get("location")!).pathname).toBe(to);
  });

  it("keeps the query parameters", () => {
    const res = run("/papers/1?utm_source=newsletter&x=1");
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/papers/paper-1-the-universal-father");
    expect(location.search).toBe("?utm_source=newsletter&x=1");
  });

  it.each(["/papers/paper-197-x", "/papers/nothing", "/papers/the-universal-father"])(
    "does not redirect %s, so the page can answer 404",
    (path) => {
      expect(run(path).headers.get("location")).toBeNull();
    },
  );
});
