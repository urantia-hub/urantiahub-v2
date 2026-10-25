import { notFound } from "next/navigation";
import { PrivacyView, privacyMetadata } from "@/components/pages/PrivacyView";
import { spanishOn } from "@/i18n/lang";

export function generateMetadata() {
  return spanishOn() ? privacyMetadata("es") : {};
}

export default function SpanishPrivacyPage() {
  if (!spanishOn()) notFound();
  return <PrivacyView lang="es" />;
}
