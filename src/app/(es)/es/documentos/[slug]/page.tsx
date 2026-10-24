import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaperView } from "@/components/reader/PaperView";
import { getPaper } from "@/content";
import { ReadingNav } from "@/components/navigation/ReadingNav";
import { ReadMarks } from "@/components/ReadMarks";
import { SavedMarks } from "@/components/reader/SavedMarks";
import { SharedMark } from "@/components/reader/SharedMark";
import type { NavPaper } from "@/components/navigation/nav-state";
import { PAPERS_ES, paperById, paperPath } from "@/content/paper-index";
import { spanishPrerenderIds } from "@/content/prerender";
import { spanishOn } from "@/i18n/lang";
import { idFromSlug } from "@/lib/paper-url";
import { JsonLd } from "@/seo/JsonLd";
import { describe, pageMetadata, paperJsonLd } from "@/seo/metadata";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return spanishPrerenderIds().map((id) => ({ slug: paperById(id, "es")!.slug }));
}

function entryFor(slug: string) {
  const id = idFromSlug(slug);
  const entry = id === null ? undefined : paperById(id, "es");
  return entry && entry.slug === slug ? entry : undefined;
}

const headline = (entry: { id: string; title: string; partId: string }) =>
  entry.id === "0" ? entry.title : `Documento ${entry.id}: ${entry.title}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = entryFor((await params).slug);
  if (!spanishOn() || !entry) return {};
  const paper = await getPaper(entry.id, "es");
  return pageMetadata({
    title: headline(entry),
    description: describe(paper.sections[0].paragraphs[0].text),
    path: paperPath(entry.id, "es"),
    type: "article",
    ownImage: true,
    lang: "es",
    twin: paperPath(entry.id),
  });
}

export default async function SpanishPaperPage({ params }: Props) {
  // The proxy redirects a slug that is not canonical. A request that reaches here with one is a 404.
  const entry = entryFor((await params).slug);
  if (!spanishOn() || !entry) notFound();

  const paper = await getPaper(entry.id, "es");
  const n = Number(entry.id);
  const toNav = (p: (typeof PAPERS_ES)[number] | undefined): NavPaper | null =>
    p ? { id: p.id, title: p.id === "0" ? p.title : `${p.id} · ${p.title}`, href: paperPath(p.id, "es") } : null;

  return (
    <>
      <JsonLd data={paperJsonLd(entry, describe(paper.sections[0].paragraphs[0].text), "es")} />
      <PaperView paper={paper} lang="es" />
      <ReadMarks paperId={paper.id} />
      <SavedMarks paperId={paper.id} />
      <SharedMark />
      {/* No voice in Spanish. */}
      <ReadingNav
        paper={{ id: paper.id, title: paper.title }}
        sections={paper.sections.map((s) => ({ id: s.id, title: s.title }))}
        previous={toNav(PAPERS_ES[n - 1])}
        next={toNav(PAPERS_ES[n + 1])}
        tracks={null}
        voice={null}
        lang="es"
      />
    </>
  );
}

