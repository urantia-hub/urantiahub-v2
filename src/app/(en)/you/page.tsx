import type { Metadata } from "next";
import { YouView } from "@/components/you/YouView";
import { ownPageMetadata } from "@/seo/metadata";

// A reader's own page. It stays out of each search engine, at each index setting.
export const metadata: Metadata = ownPageMetadata("Your page", "/you");

export default function YouPage() {
  return <YouView />;
}
