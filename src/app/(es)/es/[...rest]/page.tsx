import { notFound } from "next/navigation";

// Each other address under /es: the Spanish not-found page, in the Spanish shell. The global page is English.
export default function SpanishUnknown() {
  notFound();
}
