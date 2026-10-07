import { notFound } from "next/navigation";
import { PaperView } from "@/components/reader/PaperView";
import { getPaper } from "@/content";
import { ReadingNav } from "@/components/navigation/ReadingNav";
import type { NavPaper } from "@/components/navigation/nav-state";
import { PAPERS, paperById, paperPath } from "@/content/paper-index";
import { prerenderIds } from "@/content/prerender";
import { idFromSlug } from "@/lib/paper-url";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return prerenderIds().map((id) => ({ slug: paperById(id)!.slug }));
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
      <PaperView paper={paper} />
      <ReadingNav
        paper={{ id: paper.id, title: paper.title }}
        sections={paper.sections.map((s) => ({ id: s.id, title: s.title }))}
        previous={toNav(PAPERS[n - 1])}
        next={toNav(PAPERS[n + 1])}
      />
    </>
  );
}
