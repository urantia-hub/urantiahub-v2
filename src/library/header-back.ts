import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { textsHref } from "@/i18n/paths";

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

// The same short names in Spanish, from the Spanish titles of the catalog without their article.
export const SHORT_NAMES_ES: Record<string, string> = {
  bible: "Biblia",
  "diogenes-laertius-6": "Diógenes Laercio",
  "epictetus-cynic": "Epicteto",
  dhammapada: "Dhammapada",
  "bhagavad-gita": "Bhagavad Gita",
  "shinto-oracles": "Oráculos sintoístas",
  "tao-te-ching": "Tao Te Ching",
  analects: "Analectas",
  quran: "Corán",
  japji: "Japji",
  "book-of-mormon": "Libro de Mormón",
  "rig-veda": "Rigveda",
  "book-of-the-dead": "Libro de los Muertos",
  hesiod: "Hesíodo",
  "homeric-hymns": "Himnos homéricos",
  "poetic-edda": "Edda poética",
  "aztec-hymns": "Himnos aztecas",
  "chuang-tzu": "Chuang Tzu",
  "prose-edda": "Edda en prosa",
  kojiki: "Kojiki",
  upanishads: "Upanishads",
  "shu-king": "Shu King",
};

export const shortNames = (lang: Lang) => (lang === "es" ? SHORT_NAMES_ES : SHORT_NAMES);

/** The way up one step from a page of World texts: a page goes to its work, a work to World texts. */
export function headerBack(pathname: string): { href: string; label: string } | null {
  const lang: Lang = pathname.startsWith("/es/") ? "es" : "en";
  const parts = pathname.split("/").slice(lang === "es" ? 2 : 1);
  const [root, slug, page, ...rest] = parts;
  if (root !== (lang === "es" ? "textos" : "texts") || !slug || rest.length) return null;
  const top = { href: textsHref(lang), label: messages(lang).texts.title };
  if (!page) return top;
  if (page === "at") return null;
  const label = shortNames(lang)[slug];
  return label ? { href: textsHref(lang, slug), label } : top;
}
