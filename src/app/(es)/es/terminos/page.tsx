import { notFound } from "next/navigation";
import { TermsView, termsMetadata } from "@/components/pages/TermsView";
import { spanishOn } from "@/i18n/lang";

export function generateMetadata() {
  return spanishOn() ? termsMetadata("es") : {};
}

export default function SpanishTermsPage() {
  if (!spanishOn()) notFound();
  return <TermsView lang="es" />;
}
