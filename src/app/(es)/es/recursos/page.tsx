import { notFound } from "next/navigation";
import { ResourcesView, resourcesMetadata } from "@/components/pages/ResourcesView";
import { spanishOn } from "@/i18n/lang";

export function generateMetadata() {
  return spanishOn() ? resourcesMetadata("es") : {};
}

export default function SpanishResourcesPage() {
  if (!spanishOn()) notFound();
  return <ResourcesView lang="es" />;
}
