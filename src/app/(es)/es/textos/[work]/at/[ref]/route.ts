import { spanishOn } from "@/i18n/lang";
import { handleLibraryAt } from "@/library/at";

// A passage of a work in Spanish: its page in /es/textos, at the passage.
export const GET = (request: Request, { params }: { params: Promise<{ work: string; ref: string }> }) =>
  spanishOn() ? params.then((p) => handleLibraryAt({ ...p, search: new URL(request.url).search, lang: "es" })) : new Response("Not found", { status: 404 });
