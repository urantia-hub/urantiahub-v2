import type { Metadata } from "next";
import { EXAMPLE_REF, HowItWorks } from "@/components/library/HowItWorks";
import { getLibrary, getNamedParallels } from "@/content";
import type { LibraryWork } from "@/content/library";
import { LIBRARY_LINKS } from "@/library/flags";
import { pageMetadata } from "@/seo/metadata";
import { shapeParallels } from "@/server/parallels";

export function generateMetadata(): Metadata {
  const meta = pageMetadata({
    title: "How World texts work",
    description: "What a parallel is, what its number means, where each world text comes from, and why these works are here.",
    path: "/texts/how-it-works",
    ownImage: true,
  });
  return LIBRARY_LINKS ? meta : { ...meta, robots: { index: false, follow: false } };
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

export default async function HowItWorksPage() {
  const works = await getLibrary();
  return <HowItWorks works={works} example={await example(works)} />;
}
