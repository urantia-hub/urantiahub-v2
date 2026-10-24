import type { Metadata } from "next";
import { SearchView } from "@/components/search/SearchView";

// A results page is not a page of the text. It stays out of each search engine, at each index setting.
export const metadata: Metadata = { title: "Search", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function SearchPage({ searchParams }: Props) {
  return <SearchView searchParams={searchParams} lang="en" />;
}
