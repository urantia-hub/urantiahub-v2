// What "Read offline" keeps on the device, as plain functions. The browser code is in offline.ts.

/** The files of the site that a page names: scripts, styles, and faces. */
export function assetsOfPage(html: string): string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"?#]+)(?:[?#][^"]*)?"/g)) found.add(match[1]);
  return [...found];
}

/** The files that a style sheet names, as paths of the site. */
export function assetsOfStyle(css: string, sheet: string): string[] {
  const found = new Set<string>();
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    if (match[1].startsWith("data:")) continue;
    try {
      const url = new URL(match[1], `https://site${sheet}`);
      if (url.host === "site" && url.pathname.startsWith("/_next/static/")) found.add(url.pathname);
    } catch {
      // Not an address. It names no file.
    }
  }
  return [...found];
}

/** The pages to keep: the home page, the contents, and each paper. */
export function pagesToKeep(lang: "en" | "es", paperPaths: readonly string[]): string[] {
  return lang === "es" ? ["/es/documentos", ...paperPaths] : ["/", "/papers", ...paperPaths];
}

/** Runs a job for each item, a few at a time. It stops at the first failure and says how far it got. */
export async function inTurns<T>(items: readonly T[], width: number, job: (item: T) => Promise<void>): Promise<boolean> {
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (!failed && next < items.length) {
      const item = items[next];
      next += 1;
      try {
        await job(item);
      } catch {
        failed = true;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(width, items.length) }, worker));
  return !failed;
}
