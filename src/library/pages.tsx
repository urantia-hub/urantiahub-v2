import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { EXAMPLE_REF, HowItWorks } from "@/components/library/HowItWorks";
import { LibraryView, libraryLead } from "@/components/library/LibraryView";
import { TextMarks } from "@/components/library/TextMarks";
import { WorkExtras, WorkHead, WorkHome } from "@/components/library/WorkHome";
import { WorkNav } from "@/components/library/WorkNav";
import { WorkView } from "@/components/library/WorkView";
import { SharedMark } from "@/components/reader/SharedMark";
import { getLibrary, getNamedParallels, getParagraphText, getWorkPage, getWorkPages, getWorkPairs, PageNotFound } from "@/content";
import type { LibraryWork } from "@/content/library";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { howHref, textsHref } from "@/i18n/paths";
import { pageMetadata } from "@/seo/metadata";
import { outsideHref, shapeParallels, workName } from "@/server/parallels";
import { BIBLE, bibleBooks } from "./bible";
import { GROUPED, workBooks } from "./books";
import { workContents, workFacts } from "./contents";
import { LIBRARY_LINKS } from "./flags";
import { shortNames } from "./header-back";
import { chapterRow, pageLabels, unitCount } from "./labels";
import { pairsIn } from "./pairs-in";
import { workHeadline } from "./seo";

// The pages of World texts in each language: the routes under `/texts` and `/es/textos` are one line each.
// A page names its twin; the English one has its own share image, the Spanish one the image of `/es`.
const other = (lang: Lang): Lang => (lang === "en" ? "es" : "en");

function meta(lang: Lang, input: { title: string; description: string; path: (lang: Lang) => string; type?: "website" | "article" }): Metadata {
  const page = pageMetadata({ title: input.title, description: input.description, path: input.path(lang), type: input.type, ownImage: lang === "en", lang, twin: input.path(other(lang)) });
  return LIBRARY_LINKS ? page : { ...page, robots: { index: false, follow: false } };
}

// World texts.
export async function libraryMetadata(lang: Lang): Promise<Metadata> {
  const works = await getLibrary(lang);
  return meta(lang, { title: messages(lang).texts.title, description: libraryLead(works, lang), path: (l) => textsHref(l) });
}

export async function LibraryPage({ lang }: { lang: Lang }) {
  return <LibraryView works={await getLibrary(lang)} lang={lang} />;
}

// How it works.
export function howMetadata(lang: Lang): Metadata {
  const t = messages(lang).how;
  return meta(lang, { title: t.title, description: t.description, path: howHref });
}

// The nearest passage of another work to one paragraph, as the parallels sheet shows it first. A failure shows no example.
async function example(works: readonly LibraryWork[]) {
  try {
    const raw = await getNamedParallels(EXAMPLE_REF);
    return shapeParallels(raw, "", EXAMPLE_REF.split(":")[0], new Map(works.map((w) => [w.corpusId, w.slug]))).outside[0] ?? null;
  } catch {
    return null;
  }
}

export async function HowPage({ lang }: { lang: Lang }) {
  const works = await getLibrary(lang);
  return <HowItWorks works={works} example={await example(await getLibrary())} lang={lang} />;
}

// The page of a work.
export async function workParams() {
  return (await getLibrary()).map((w) => ({ work: w.slug }));
}

async function loadWork(slug: string, lang: Lang) {
  const work = (await getLibrary(lang)).find((w) => w.slug === slug);
  if (!work) return null;
  const pages = await getWorkPages(slug, lang);
  const contents = workContents(work, pages, lang);
  return { work, pages, contents, facts: workFacts(work, contents, lang) };
}

export async function workMetadata(slug: string, lang: Lang): Promise<Metadata> {
  const found = await loadWork(slug, lang);
  if (!found) return {};
  return meta(lang, { title: workHeadline(found.work, found.facts, found.contents.kind, lang), description: found.work.summary, path: (l) => textsHref(l, slug) });
}

// The short name in the dock: "Dhammapada", "Bible" ("Biblia").
const shortOf = (work: LibraryWork, lang: Lang) => (lang === "en" ? workName({ id: work.corpusId, title: work.title }) : (shortNames(lang)[work.slug] ?? work.title));
const spanishText = (paperId: string, ref: string) => getParagraphText(paperId, ref, "es");

export async function WorkHomePage({ slug, lang }: { slug: string; lang: Lang }) {
  const found = await loadWork(slug, lang);
  if (!found) notFound();
  const { work, pages, contents, facts } = found;
  const [first, pairs] = await Promise.all([getWorkPage(work.slug, pages[0].key), getWorkPairs(work.slug).then((all) => pairsIn(all, lang, spanishText))]);
  // The page of the source, with no words to find: the first passage is the top of the work.
  const source = outsideHref(first[0]?.url?.split("#")[0] ?? null);
  if (contents.kind !== "single") return <WorkHome work={work} facts={facts} source={source} start={textsHref(lang, work.slug, pages[0].key)} contents={contents} pairs={pairs} lang={lang} />;
  // A work of one page: its text is the page, after the head of the work.
  const page = pages[0];
  const nav = { slug: work.slug, title: work.title, short: shortOf(work, lang), summary: work.summary };
  return (
    <>
      <WorkView
        work={work}
        page={page}
        pages={pages}
        passages={first}
        head={<WorkHead work={work} facts={facts} source={source} start={null} lang={lang} />}
        after={<WorkExtras work={work} pairs={pairs} source={source} lang={lang} />}
        lang={lang}
      />
      <TextMarks work={work.slug} page={page.key} />
      <SharedMark work />
      <WorkNav work={nav} pages={[{ key: page.key, ...chapterRow(work, page, pages), count: unitCount(page.count, work.unitLabel, lang) }]} current={page.key} title={work.title} place={false} lang={lang} />
    </>
  );
}

// A page of a work. The first page of each work is built with the site; the others at their first visit.
export async function workPageParams() {
  const works = await getLibrary();
  const firsts = await Promise.all(works.map(async (w) => ({ work: w.slug, pages: await getWorkPages(w.slug) })));
  return firsts.filter((f) => f.pages.length > 1).map((f) => ({ work: f.work, page: f.pages[0].key }));
}

async function loadPage(slug: string, key: string, lang: Lang) {
  const work = (await getLibrary(lang)).find((w) => w.slug === slug);
  if (!work) return null;
  try {
    const pages = await getWorkPages(slug, lang);
    const page = pages.find((p) => p.key === key);
    if (!page) return null;
    return { work, pages, page, passages: await getWorkPage(slug, key) };
  } catch (error) {
    if (error instanceof PageNotFound) return null;
    throw error;
  }
}

export async function workPageMetadata(slug: string, key: string, lang: Lang): Promise<Metadata> {
  const found = await loadPage(slug, key, lang);
  if (!found) return {};
  const { title } = pageLabels(found.work, found.page, found.pages);
  return meta(lang, { title: `${title} · ${found.work.title}`, description: found.work.summary, path: (l) => textsHref(l, slug, key) });
}

export async function WorkPagePage({ slug, pageKey, lang }: { slug: string; pageKey: string; lang: Lang }) {
  const found = await loadPage(slug, pageKey, lang);
  if (!found) notFound();
  const { work, pages, page, passages } = found;
  const t = messages(lang).texts;
  if (pages.length === 1) permanentRedirect(textsHref(lang, work.slug));
  const nav = { slug: work.slug, title: work.title, short: shortOf(work, lang), summary: work.summary };
  const { eyebrow, title } = pageLabels(work, page, pages);
  // "Chapter 2" from "The Dhammapada · Chapter 2": the place names the page without the work.
  const label = eyebrow.includes(" · ") ? eyebrow.slice(eyebrow.indexOf(" · ") + 3) : null;
  const bible = work.slug === BIBLE;
  if (bible || GROUPED[work.slug]) {
    // A work in books sends its books, not a row for each page (the Bible has 1,402, the Rig Veda 1,027).
    const at = pages.findIndex((p) => p.key === page.key);
    const near = (p: (typeof pages)[number] | undefined) => (p ? { key: p.key, title: pageLabels(work, p, pages).title } : undefined);
    return (
      <>
        <WorkView work={work} page={page} pages={pages} passages={passages} lang={lang} />
        <TextMarks work={work.slug} page={page.key} />
        <SharedMark work />
        <WorkNav
          work={bible && lang === "en" ? { ...nav, short: "Bible" } : nav}
          pages={[]}
          books={{
            rows: bible ? bibleBooks(pages) : workBooks(work, pages),
            label: bible ? t.bibleBooks : work.divisionLabel === (lang === "es" ? "parte" : "part") ? t.parts : t.books,
            unit: bible ? "chapter" : GROUPED[work.slug],
            current: { book: bible ? (page.book?.code ?? "") : String(page.division), chapter: page.subdivision ?? 0 },
          }}
          previous={near(pages[at - 1])}
          next={near(pages[at + 1])}
          current={page.key}
          title={title}
          label={label}
          lang={lang}
        />
      </>
    );
  }
  const rows = pages.map((p) => ({ key: p.key, ...chapterRow(work, p, pages), count: unitCount(p.count, work.unitLabel, lang) }));
  return (
    <>
      <WorkView work={work} page={page} pages={pages} passages={passages} lang={lang} />
      <TextMarks work={work.slug} page={page.key} />
      <SharedMark work />
      <WorkNav work={nav} pages={rows} current={page.key} title={title} label={label} lang={lang} />
    </>
  );
}
