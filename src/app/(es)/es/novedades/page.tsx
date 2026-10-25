import { notFound } from "next/navigation";
import { ReleasesView, releasesMetadata } from "@/components/pages/ReleasesView";
import { spanishOn } from "@/i18n/lang";

export function generateMetadata() {
  return spanishOn() ? releasesMetadata("es") : {};
}

export default function SpanishReleasesPage() {
  if (!spanishOn()) notFound();
  return <ReleasesView lang="es" />;
}
