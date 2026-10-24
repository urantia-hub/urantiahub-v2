import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SavedView } from "@/components/saved/SavedView";
import { spanishOn } from "@/i18n/lang";

// A reader's own page. It stays out of each search engine, at each index setting.
export const metadata: Metadata = { title: "Guardados", robots: { index: false, follow: false } };

// What the reader saved, each paragraph with its Spanish text.
export default function SpanishSavedPage() {
  if (!spanishOn()) notFound();
  return (
    // The page reads `?ref=` in the browser, so the server sends the shell only.
    <Suspense fallback={<div className="saved-page" />}>
      <SavedView lang="es" />
    </Suspense>
  );
}
