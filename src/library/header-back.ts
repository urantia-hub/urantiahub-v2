// The short name of each work, for the way back in the header, where a phone has little room. A work
// that is not here goes back to World texts, so the header never names the wrong work.
export const SHORT_NAMES: Record<string, string> = {
  bible: "Bible",
  "diogenes-laertius-6": "Diogenes Laertius",
  "epictetus-cynic": "Epictetus",
  dhammapada: "Dhammapada",
  "bhagavad-gita": "Bhagavad Gita",
  "shinto-oracles": "Shinto oracles",
  "tao-te-ching": "Tao Te Ching",
  analects: "Analects",
  quran: "Koran",
  japji: "Japji",
  "book-of-mormon": "Book of Mormon",
  "rig-veda": "Rig Veda",
  "book-of-the-dead": "Book of the Dead",
  hesiod: "Hesiod",
  "homeric-hymns": "Homeric Hymns",
  "poetic-edda": "Poetic Edda",
  "aztec-hymns": "Aztec hymns",
  "chuang-tzu": "Chuang Tzu",
  "prose-edda": "Prose Edda",
  kojiki: "Kojiki",
  upanishads: "Upanishads",
  "shu-king": "Shu King",
};

const WORLD_TEXTS = { href: "/texts", label: "World texts" };

/** The way up one step from a page of World texts: a page goes to its work, a work to World texts. */
export function headerBack(pathname: string): { href: string; label: string } | null {
  const [, root, slug, page, ...rest] = pathname.split("/");
  if (root !== "texts" || !slug || rest.length) return null;
  if (!page) return WORLD_TEXTS;
  if (page === "at") return null;
  const label = SHORT_NAMES[slug];
  return label ? { href: `/texts/${slug}`, label } : WORLD_TEXTS;
}
