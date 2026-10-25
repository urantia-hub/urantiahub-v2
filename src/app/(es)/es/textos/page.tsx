import { notFound } from "next/navigation";
import { spanishOn } from "@/i18n/lang";
import { LibraryPage, libraryMetadata } from "@/library/pages";

// World texts in Spanish: the catalog in Spanish, the texts in English.
export async function generateMetadata() {
  return spanishOn() ? libraryMetadata("es") : {};
}

export default function Page() {
  if (!spanishOn()) notFound();
  return <LibraryPage lang="es" />;
}
