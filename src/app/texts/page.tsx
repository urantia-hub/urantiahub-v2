import type { Metadata } from "next";
import { LibraryView, libraryLead } from "@/components/library/LibraryView";
import { getLibrary } from "@/content";
import { LIBRARY_LINKS } from "@/library/flags";
import { pageMetadata } from "@/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const works = await getLibrary();
  const meta = pageMetadata({ title: "World texts", description: libraryLead(works), path: "/texts" });
  return LIBRARY_LINKS ? meta : { ...meta, robots: { index: false, follow: false } };
}

export default async function LibraryPage() {
  return <LibraryView works={await getLibrary()} />;
}
