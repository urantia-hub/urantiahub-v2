// The three sites that the texts come from, by the host of the source address.
const SITES: Record<string, string> = {
  "www.gutenberg.org": "Project Gutenberg",
  "en.wikisource.org": "Wikisource",
  "ebible.org": "eBible.org",
};

/** "Project Gutenberg" for a source on gutenberg.org. Null for any other site. */
export function sourceSite(url: string | null): string | null {
  if (!url) return null;
  try {
    return SITES[new URL(url).host] ?? null;
  } catch {
    return null;
  }
}
