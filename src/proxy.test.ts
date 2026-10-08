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

  it.each(["/papers/%E0%A4%A", "/papers/%", "/papers/paper-1%ZZ"])(
    "sends the malformed escape %s to the not-found page (Next.js answers 500 if it reaches the route)",
    (path) => {
      const res = run(path);
      expect(res.headers.get("location")).toBeNull();
      expect(new URL(res.headers.get("x-middleware-rewrite")!).pathname).toBe("/not-found");
    },
  );

  it.each(["/papers/paper-197-x", "/papers/nothing", "/papers/the-universal-father"])(
    "does not redirect %s, so the page can answer 404",
    (path) => {
      expect(run(path).headers.get("location")).toBeNull();
    },
  );

  // Review Focus 5: a reader with no JavaScript types a reference into the search form.
  it("sends a search for a reference to the paper at that paragraph", () => {
    const res = run("/search?q=99%3A1.1");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://next.urantiahub.com/papers/paper-99-the-social-problems-of-religion#99:1.1");
  });
  it("sends a search for a paper number and for the word foreword to that paper", () => {
    expect(run("/search?q=2").headers.get("location")).toBe("https://next.urantiahub.com/papers/paper-2-the-nature-of-god");
    expect(run("/search?q=Foreword").headers.get("location")).toBe("https://next.urantiahub.com/papers/foreword");
  });
  it("lets other searches, and the empty search screen, through", () => {
    for (const path of ["/search", "/search?q=thought+adjuster", "/search?q=197", "/search?q=99%3A1.1&q=x"]) {
      const res = run(path);
      expect(res.headers.get("x-middleware-next"), path).toBe(path.includes("&q=x") ? null : "1");
    }
  });
});
