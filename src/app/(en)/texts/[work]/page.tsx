import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkExtras, WorkHead, WorkHome } from "@/components/library/WorkHome";
import { TextMarks } from "@/components/library/TextMarks";
import { WorkNav } from "@/components/library/WorkNav";
import { SharedMark } from "@/components/reader/SharedMark";
import { WorkView } from "@/components/library/WorkView";
import { getLibrary, getWorkPage, getWorkPages, getWorkPairs } from "@/content";
import { workContents, workFacts } from "@/library/contents";
import { LIBRARY_LINKS } from "@/library/flags";
import { chapterRow, unitCount } from "@/library/labels";
import { workHeadline } from "@/library/seo";
import { pageMetadata } from "@/seo/metadata";
import { outsideHref, workName } from "@/server/parallels";

type Props = { params: Promise<{ work: string }> };

export async function generateStaticParams() {
  return (await getLibrary()).map((w) => ({ work: w.slug }));
}

async function load(slug: string) {
  const work = (await getLibrary()).find((w) => w.slug === slug);
  if (!work) return null;
  const pages = await getWorkPages(slug);
  const contents = workContents(work, pages);
  return { work, pages, contents, facts: workFacts(work, contents) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load((await params).work);
  if (!found) return {};
  const meta = pageMetadata({ title: workHeadline(found.work, found.facts, found.contents.kind), description: found.work.summary, path: `/texts/${found.work.slug}`, ownImage: true });
  return LIBRARY_LINKS ? meta : { ...meta, robots: { index: false, follow: false } };
}

export default async function WorkHomePage({ params }: Props) {
  const found = await load((await params).work);
  if (!found) notFound();
  const { work, pages, contents, facts } = found;
  const [first, pairs] = await Promise.all([getWorkPage(work.slug, pages[0].key), getWorkPairs(work.slug)]);
  // The page of the source, with no words to find: the first passage is the top of the work.
  const source = outsideHref(first[0]?.url?.split("#")[0] ?? null);
  if (contents.kind !== "single") return <WorkHome work={work} facts={facts} source={source} start={`/texts/${work.slug}/${pages[0].key}`} contents={contents} pairs={pairs} />;
  // A work of one page: its text is the page, after the head of the work.
  const page = pages[0];
  const nav = { slug: work.slug, title: work.title, short: workName({ id: work.corpusId, title: work.title }), summary: work.summary };
  return (
    <>
      <WorkView
        work={work}
        page={page}
        pages={pages}
        passages={first}
        head={<WorkHead work={work} facts={facts} source={source} start={null} />}
        after={<WorkExtras work={work} pairs={pairs} source={source} />}
      />
      <TextMarks work={work.slug} page={page.key} />
      <SharedMark work />
      <WorkNav work={nav} pages={[{ key: page.key, ...chapterRow(work, page, pages), count: unitCount(page.count, work.unitLabel) }]} current={page.key} title={work.title} place={false} />
    </>
  );
}
