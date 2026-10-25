import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { shortNames } from "@/library/header-back";
import { cutWords } from "@/reader/share-link";
import { pageMetadata } from "@/seo/metadata";
import { pairOf, type PairSide } from "./pair";
import { PairView } from "./PairView";
import type { ViewPair, ViewSide } from "./view";

// Two passages side by side: one of the Papers and one of a world text. Each opens its passage, marked.
// Unlike a link to one paragraph, this page does not send a person on: the page is the point.
export async function PairPage({ parts, lang = "en" }: { parts: readonly string[]; lang?: Lang }) {
  const pair = await pairOf(parts, undefined, lang);
  if (!pair) notFound();
  if ("go" in pair) redirect(pair.go);
  const side = ({ eyebrow, kind, units, source, shortRef, base, hash }: PairSide, card: string): ViewSide => ({ eyebrow, card, kind, units, source, shortRef, base, hash });
  // The card and the picture name a world text by its short name, so its eyebrow stays on one line.
  const view: ViewPair = { work: pair.work, refPart: pair.refPart, passagePart: pair.passagePart, a: side(pair.a, pair.a.eyebrow), b: side(pair.b, shortNames(lang)[pair.work] ?? pair.b.eyebrow), lang };
  return (
    <main className="pair-page">
      <PairView pair={view} start={{ a: [...pair.a.chosen], b: [...pair.b.chosen] }} />
    </main>
  );
}

// The twin is the same parts in the other language: `/s/...` and `/es/s/...`.
export async function pairMetadata(parts: readonly string[], lang: Lang = "en"): Promise<Metadata> {
  const pair = await pairOf(parts, undefined, lang);
  if (!pair || "go" in pair) return {};
  const t = messages(lang).pair;
  const twin = lang === "es" ? pair.path.slice(3) : `/es${pair.path}`;
  return {
    ...pageMetadata({ title: t.title(pair.a.shortRef, pair.b.shortRef), description: t.title(`“${cutWords(pair.a.words, 90)}”`, `“${cutWords(pair.b.words, 60)}”`), path: pair.path, type: "article", ownImage: true, lang, twin }),
    // A person who got the link reads it here. The paper and the work are the pages for a search engine.
    robots: { index: false, follow: true },
  };
}
