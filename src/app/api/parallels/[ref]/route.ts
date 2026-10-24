import { getParagraphText, getParallels, getWorks } from "@/content";
import { handleParallels } from "@/server/parallels";

// The passages that are near in meaning to one paragraph, for the Parallels sheet of the reader. `?lang=es`
// reads the Spanish paragraph and the Spanish passages of the Papers.
export async function GET(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const lang = new URL(request.url).searchParams.get("lang") === "es" ? "es" : "en";
  return handleParallels(ref, getParallels, getParagraphText, getWorks, lang);
}
