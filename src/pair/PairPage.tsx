import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cutWords } from "@/reader/share-link";
import { pageMetadata } from "@/seo/metadata";
import { pairOf } from "./pair";
import { PairQuote } from "./PairQuotes";

// Two passages side by side: one of the Papers and one of a world text. Each opens its passage, marked.
// Unlike a link to one paragraph, this page does not send a person on: the page is the point.
export async function PairPage({ parts }: { parts: readonly string[] }) {
  const pair = await pairOf(parts);
  if (!pair) notFound();
  if ("go" in pair) redirect(pair.go);
  const { a, b } = pair;
  return (
    <main className="pair-page">
      <div className="pair-cols">
        <PairQuote href={a.target} eyebrow={a.eyebrow} kind={null} words={a.words} source={a.source} go="Read in the paper" />
        <div className="pair-and">and</div>
        <PairQuote href={b.target} eyebrow={b.eyebrow} kind={b.kind} words={b.words} source={b.source} go="Read in World texts" />
      </div>
    </main>
  );
}

export async function pairMetadata(parts: readonly string[]): Promise<Metadata> {
  const pair = await pairOf(parts);
  if (!pair || "go" in pair) return {};
  return {
    ...pageMetadata({ title: `${pair.a.shortRef} and ${pair.b.shortRef}`, description: `“${cutWords(pair.a.words, 90)}” and “${cutWords(pair.b.words, 60)}”`, path: pair.path, type: "article", ownImage: true }),
    // A person who got the link reads it here. The paper and the work are the pages for a search engine.
    robots: { index: false, follow: true },
  };
}
