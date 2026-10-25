import { notFound } from "next/navigation";
import { spanishOn } from "@/i18n/lang";
import { HowPage, howMetadata } from "@/library/pages";

export function generateMetadata() {
  return spanishOn() ? howMetadata("es") : {};
}

export default function Page() {
  if (!spanishOn()) notFound();
  return <HowPage lang="es" />;
}
