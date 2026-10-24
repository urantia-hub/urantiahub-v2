import type { Metadata } from "next";
import { Suspense } from "react";
import { StudyView } from "@/components/parallels/StudyView";

// A page for one paragraph and its parallels. It stays out of each search engine, at each index setting.
export const metadata: Metadata = { title: "Parallels", robots: { index: false, follow: false } };

export default function ParallelsPage() {
  return (
    // The page reads `?ref=` in the browser, so the server sends the shell only.
    <Suspense fallback={<div className="study-page" />}>
      <StudyView />
    </Suspense>
  );
}
