import { notFound, redirect } from "next/navigation";
import { spanishOn } from "@/i18n/lang";

// The Spanish home page comes here next. Until then the Spanish contents answer, with a redirect that is not permanent.
export default function SpanishHome() {
  if (!spanishOn()) notFound();
  redirect("/es/documentos");
}
