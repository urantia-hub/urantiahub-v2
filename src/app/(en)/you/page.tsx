import type { Metadata } from "next";
import { YouView } from "@/components/you/YouView";

// A reader's own page. It stays out of each search engine, at each index setting.
export const metadata: Metadata = { title: "Your page", robots: { index: false, follow: false } };

export default function YouPage() {
  return <YouView />;
}
