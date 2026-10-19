import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkNav } from "@/components/library/WorkNav";
import { WorkView } from "@/components/library/WorkView";
import { getLibrary, getWorkPage, getWorkPages, PageNotFound } from "@/content";
import { LIBRARY_LINKS } from "@/library/flags";
import { chapterRow, pageLabels, unitCount } from "@/library/labels";
import { pageMetadata } from "@/seo/metadata";
import { workName } from "@/server/parallels";

type Props = { params: Promise<{ work: string; page: string }> };

// The first page of each work is built with the site. The other pages are built at their first visit.
export async function generateStaticParams() {
  const works = await getLibrary();
  return Promise.all(works.map(async (w) => ({ work: w.slug, page: (await getWorkPages(w.slug))[0].key })));
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
  const meta = pageMetadata({ title: `${title} · ${found.work.title}`, description: found.work.summary, path: `/library/${slug}/${key}` });
  return LIBRARY_LINKS ? meta : { ...meta, robots: { index: false, follow: false } };
}

export default async function WorkPagePage({ params }: Props) {
  const { work: slug, page: key } = await params;
  const found = await load(slug, key);
  if (!found) notFound();
  const { work, pages, page, passages } = found;
  const rows = pages.map((p) => ({ key: p.key, ...chapterRow(work, p, pages), count: unitCount(p.count, work.unitLabel) }));
  return (
    <>
      <WorkView work={work} page={page} pages={pages} passages={passages} />
      <WorkNav
        work={{ slug: work.slug, title: work.title, short: workName({ id: work.corpusId, title: work.title }), summary: work.summary }}
        pages={rows}
        current={page.key}
        title={pageLabels(work, page, pages).title}
      />
    </>
  );
}
