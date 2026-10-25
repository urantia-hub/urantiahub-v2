import { notFound } from "next/navigation";

// The target of a malformed Spanish address: a static route, so no parameter has to be decoded.
export default function SpanishMalformed() {
  notFound();
}
