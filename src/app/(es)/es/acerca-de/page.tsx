import { notFound } from "next/navigation";
import { AboutView, aboutMetadata } from "@/components/pages/AboutView";
import { spanishOn } from "@/i18n/lang";

export function generateMetadata() {
  return spanishOn() ? aboutMetadata("es") : {};
}

export default function SpanishAboutPage() {
  if (!spanishOn()) notFound();
  return <AboutView lang="es" />;
}
