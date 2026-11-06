import { notFound } from "next/navigation";
import { VisionView, visionMetadata } from "@/components/pages/VisionView";
import { spanishOn } from "@/i18n/lang";

export function generateMetadata() {
  return spanishOn() ? visionMetadata("es") : {};
}

export default function SpanishVisionPage() {
  if (!spanishOn()) notFound();
  return <VisionView lang="es" />;
}
