import type { Metadata } from "next";
import { Suspense } from "react";
import { SavedView } from "@/components/saved/SavedView";

// A reader's own page. It stays out of each search engine, at each index setting.
export const metadata: Metadata = { title: "Saved", robots: { index: false, follow: false } };

export default function SavedPage() {
  return (
    // The page reads `?ref=` in the browser, so the server sends the shell only.
    <Suspense fallback={<div className="saved-page" />}>
      <SavedView />
    </Suspense>
  );
}
