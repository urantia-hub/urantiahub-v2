import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentsView } from "@/components/ContentsView";
import { spanishOn } from "@/i18n/lang";
import { pageMetadata } from "@/seo/metadata";

export function generateMetadata(): Metadata {
  if (!spanishOn()) return {};
  return pageMetadata({
    title: "Los Documentos de Urantia: índice",
    description: "El prólogo y los 196 documentos de Urantia en español, en cuatro partes.",
    path: "/es/documentos",
    lang: "es",
    twin: "/papers",
  });
}

// The Spanish contents page: the same page as the English one, in Spanish.
export default function SpanishContents() {
  if (!spanishOn()) notFound();
  return <ContentsView lang="es" />;
}
