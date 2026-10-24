import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeView } from "@/components/home/HomeView";
import { excerptPassage, getPassage } from "@/content";
import { HOME_PASSAGES_ES } from "@/content/passages";
import { spanishOn } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { pageMetadata } from "@/seo/metadata";

const t = messages("es");

export function generateMetadata(): Metadata {
  if (!spanishOn()) return {};
  return pageMetadata({ title: t.homeMetaTitle, absoluteTitle: true, description: t.homeMetaDescription, path: "/es", lang: "es", twin: "/" });
}

// The Spanish home page: the same page as the English one, with the Spanish passages.
export default async function SpanishHome() {
  if (!spanishOn()) notFound();
  // The build fails here if a passage is not an exact run of whole sentences from its paragraph.
  const passages = await Promise.all(
    HOME_PASSAGES_ES.map(async (entry) => excerptPassage(await getPassage(entry.ref, "es"), entry)),
  );
  return <HomeView lang="es" passages={passages} />;
}
