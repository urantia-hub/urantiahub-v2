import { getParagraphText } from "@/content";
import { handleEnglish } from "@/server/english";

// The English text of one paragraph, for "Ver en inglés" on a Spanish page.
export async function GET(_request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return handleEnglish(ref, getParagraphText);
}
