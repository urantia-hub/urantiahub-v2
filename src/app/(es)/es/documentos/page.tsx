import { notFound, permanentRedirect } from "next/navigation";
import { spanishOn } from "@/i18n/lang";

// The list of the documents is the Spanish contents page.
export default function SpanishDocuments() {
  if (!spanishOn()) notFound();
  permanentRedirect("/es");
}
