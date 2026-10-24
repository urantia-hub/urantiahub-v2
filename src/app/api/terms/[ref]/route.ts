import { getParagraphText } from "@/content";
import { handleTerms } from "@/server/terms";

// The glossary terms of one paragraph, for the Terms sheet of the reader. `?lang=es` reads the Spanish text.
export async function GET(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const lang = new URL(request.url).searchParams.get("lang") === "es" ? "es" : "en";
  return handleTerms(ref, getParagraphText, lang);
}
