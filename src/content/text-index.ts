import raw from "./text-index.json";

// Each world text, for its marks: its title, the name of its pages, and each page with its count of
// passages and of words. Server code only. Written by `bun run sync:texts`.
export type TextPage = { key: string; passages: number; words: number };
export type TextWork = { slug: string; title: string; unit: string; pages: readonly TextPage[]; words: number };

type Row = [string, number, number];
const works = raw.works as unknown as Record<string, { title: string; unit: string; pages: Row[] }>;

export const TEXT_WORKS: readonly TextWork[] = Object.entries(works).map(([slug, work]) => {
  const pages = work.pages.map(([key, passages, words]) => ({ key, passages, words }));
  return { slug, title: work.title, unit: work.unit, pages, words: pages.reduce((n, page) => n + page.words, 0) };
});

const bySlug = new Map(TEXT_WORKS.map((work) => [work.slug, work]));
const keysOf = new Map(TEXT_WORKS.map((work) => [work.slug, new Set(work.pages.map((page) => page.key))]));

export const textWork = (slug: string): TextWork | undefined => bySlug.get(slug);
export const isTextPage = (slug: string, key: string): boolean => keysOf.get(slug)?.has(key) ?? false;
