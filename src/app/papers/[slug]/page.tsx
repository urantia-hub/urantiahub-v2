import { notFound } from "next/navigation";
import { PaperView } from "@/components/reader/PaperView";
import { getPaper } from "@/content";
import { paperById } from "@/content/paper-index";
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
  return <PaperView paper={paper} />;
}
