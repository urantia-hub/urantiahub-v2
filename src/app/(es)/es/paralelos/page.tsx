import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StudyView } from "@/components/parallels/StudyView";
import { spanishOn } from "@/i18n/lang";

// A page for one paragraph and its parallels. It stays out of each search engine, at each index setting.
export const metadata: Metadata = { title: "Paralelos", robots: { index: false, follow: false } };

export default function SpanishParallelsPage() {
  if (!spanishOn()) notFound();
  return (
    // The page reads `?ref=` in the browser, so the server sends the shell only.
    <Suspense fallback={<div className="study-page" />}>
      <StudyView lang="es" />
    </Suspense>
  );
}
