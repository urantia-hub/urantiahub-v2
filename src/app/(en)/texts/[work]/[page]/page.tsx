import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { TextMarks } from "@/components/library/TextMarks";
import { SharedMark } from "@/components/reader/SharedMark";
import { WorkNav } from "@/components/library/WorkNav";
import { WorkView } from "@/components/library/WorkView";
import { getLibrary, getWorkPage, getWorkPages, PageNotFound } from "@/content";
import { BIBLE, bibleBooks } from "@/library/bible";
import { GROUPED, workBooks } from "@/library/books";
import { LIBRARY_LINKS } from "@/library/flags";
import { chapterRow, pageLabels, unitCount } from "@/library/labels";
import { pageMetadata } from "@/seo/metadata";
import { workName } from "@/server/parallels";

type Props = { params: Promise<{ work: string; page: string }> };

// The first page of each work is built with the site. The other pages are built at their first visit. A work of
// one page has its text on the page of the work, and its one page redirects there.
export async function generateStaticParams() {
  const works = await getLibrary();
  const firsts = await Promise.all(works.map(async (w) => ({ work: w.slug, pages: await getWorkPages(w.slug) })));
  return firsts.filter((f) => f.pages.length > 1).map((f) => ({ work: f.work, page: f.pages[0].key }));
}

async function load(slug: string, key: string) {
  const work = (await getLibrary()).find((w) => w.slug === slug);
  if (!work) return null;
  try {
    const pages = await getWorkPages(slug);
    const page = pages.find((p) => p.key === key);
    if (!page) return null;
    return { work, pages, page, passages: await getWorkPage(slug, key) };
  } catch (error) {
    if (error instanceof PageNotFound) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { work: slug, page: key } = await params;
  const found = await load(slug, key);
  if (!found) return {};
  const { title } = pageLabels(found.work, found.page, found.pages);
  const meta = pageMetadata({ title: `${title} · ${found.work.title}`, description: found.work.summary, path: `/texts/${slug}/${key}`, ownImage: true });
  return LIBRARY_LINKS ? meta : { ...meta, robots: { index: false, follow: false } };
}

export default async function WorkPagePage({ params }: Props) {
  const { work: slug, page: key } = await params;
  const found = await load(slug, key);
  if (!found) notFound();
  const { work, pages, page, passages } = found;
  if (pages.length === 1) permanentRedirect(`/texts/${work.slug}`);
  const nav = { slug: work.slug, title: work.title, short: workName({ id: work.corpusId, title: work.title }), summary: work.summary };
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
        <WorkView work={work} page={page} pages={pages} passages={passages} />
        <TextMarks work={work.slug} page={page.key} />
        <SharedMark work />
        <WorkNav
          work={bible ? { ...nav, short: "Bible" } : nav}
          pages={[]}
          books={{
            rows: bible ? bibleBooks(pages) : workBooks(work, pages),
            label: bible ? "The books of the Bible" : work.divisionLabel === "part" ? "Parts" : "Books",
            unit: bible ? "chapter" : GROUPED[work.slug],
            current: { book: bible ? (page.book?.code ?? "") : String(page.division), chapter: page.subdivision ?? 0 },
          }}
          previous={near(pages[at - 1])}
          next={near(pages[at + 1])}
          current={page.key}
          title={title}
          label={label}
        />
      </>
    );
  }
  const rows = pages.map((p) => ({ key: p.key, ...chapterRow(work, p, pages), count: unitCount(p.count, work.unitLabel) }));
  return (
    <>
      <WorkView work={work} page={page} pages={pages} passages={passages} />
      <TextMarks work={work.slug} page={page.key} />
      <SharedMark work />
      <WorkNav work={nav} pages={rows} current={page.key} title={title} label={label} />
    </>
  );
}
