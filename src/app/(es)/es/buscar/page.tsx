import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SearchView } from "@/components/search/SearchView";
import { spanishOn } from "@/i18n/lang";

// A results page is not a page of the text. It stays out of each search engine, at each index setting.
export const metadata: Metadata = { title: "Buscar", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function BuscarPage({ searchParams }: Props) {
  if (!spanishOn()) notFound();
  return <SearchView searchParams={searchParams} lang="es" />;
}
