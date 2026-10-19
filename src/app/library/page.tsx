import type { Metadata } from "next";
import { LibraryView, libraryLead } from "@/components/library/LibraryView";
import { getLibrary, getWorkPages } from "@/content";
import { LIBRARY_LINKS } from "@/library/flags";
import { pageMetadata } from "@/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const works = await getLibrary();
  const meta = pageMetadata({ title: "Library", description: libraryLead(works.length), path: "/library" });
  return LIBRARY_LINKS ? meta : { ...meta, robots: { index: false, follow: false } };
}

export default async function LibraryPage() {
  const works = await getLibrary();
  const firstKeys = Object.fromEntries(await Promise.all(works.map(async (w) => [w.slug, (await getWorkPages(w.slug))[0].key] as const)));
  return <LibraryView works={works} firstKeys={firstKeys} />;
}
