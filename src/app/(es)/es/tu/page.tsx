import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { YouView } from "@/components/you/YouView";
import { spanishOn } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { ownPageMetadata } from "@/seo/metadata";

export const metadata: Metadata = ownPageMetadata(messages("es").you.title, "/you");

// The reader's own page in Spanish.
export default function SpanishYouPage() {
  if (!spanishOn()) notFound();
  return <YouView lang="es" />;
}
