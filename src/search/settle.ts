import type { SearchPage } from "@/content/fetchers";

export type Outcome = { ok: true; page: SearchPage } | { ok: false };

// The result of a search, as a value. It never throws, and it never waits longer than the limit:
// a search that hangs must not hold the page.
export function settle(search: Promise<SearchPage>, limit = 8000): Promise<Outcome> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false }), limit);
    search.then(
      (page) => {
        clearTimeout(timer);
        resolve({ ok: true, page });
      },
      () => {
        clearTimeout(timer);
        resolve({ ok: false });
      },
    );
  });
}
