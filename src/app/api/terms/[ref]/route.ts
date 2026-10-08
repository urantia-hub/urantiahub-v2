import { getParagraphText } from "@/content";
import { handleTerms } from "@/server/terms";

// The glossary terms of one paragraph, for the Terms sheet of the reader.
export async function GET(_request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return handleTerms(ref, getParagraphText);
}
