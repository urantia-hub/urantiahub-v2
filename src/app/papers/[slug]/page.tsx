import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaperView } from "@/components/reader/PaperView";
import { paperTracks } from "@/audio/tracks";
import { getPaper } from "@/content";
import { ReadingNav } from "@/components/navigation/ReadingNav";
import { ReadMarks } from "@/components/ReadMarks";
import type { NavPaper } from "@/components/navigation/nav-state";
import { PAPERS, paperById, paperPath } from "@/content/paper-index";
import { prerenderIds } from "@/content/prerender";
import { idFromSlug } from "@/lib/paper-url";
import { JsonLd } from "@/seo/JsonLd";
import { describe, pageMetadata, paperHeadline, paperJsonLd } from "@/seo/metadata";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return prerenderIds().map((id) => ({ slug: paperById(id)!.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const entry = id === null ? undefined : paperById(id);
  if (!entry || entry.slug !== slug) return {};
  const paper = await getPaper(entry.id);
  return pageMetadata({
    title: paperHeadline(entry),
    description: describe(paper.sections[0].paragraphs[0].text),
    path: paperPath(entry.id),
    type: "article",
  });
}

export default async function PaperPage({ params }: Props) {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const entry = id === null ? undefined : paperById(id);
  // The proxy redirects a slug that is not canonical. A request that reaches here with one is a 404.
  if (!entry || entry.slug !== slug) notFound();

  const paper = await getPaper(entry.id);
  const n = Number(entry.id);
  const toNav = (p: (typeof PAPERS)[number] | undefined): NavPaper | null =>
    p ? { id: p.id, title: p.id === "0" ? p.title : `${p.id} · ${p.title}`, href: paperPath(p.id) } : null;

  return (
    <>
      <JsonLd data={paperJsonLd(entry, describe(paper.sections[0].paragraphs[0].text))} />
      <PaperView paper={paper} />
      <ReadMarks paperId={paper.id} />
      <ReadingNav
        paper={{ id: paper.id, title: paper.title }}
        sections={paper.sections.map((s) => ({ id: s.id, title: s.title }))}
        previous={toNav(PAPERS[n - 1])}
        next={toNav(PAPERS[n + 1])}
        tracks={paperTracks(paper)}
      />
    </>
  );
}
