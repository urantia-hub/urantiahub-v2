import type { Metadata } from "next";
import { ProgressView } from "@/components/progress/ProgressView";

// A reader's own page. It stays out of each search engine, at each index setting.
export const metadata: Metadata = { title: "Your progress", robots: { index: false, follow: false } };

export default function ProgressPage() {
  return <ProgressView />;
}
