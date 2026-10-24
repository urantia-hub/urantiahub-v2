import type { NextRequest } from "next/server";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";
import { type AllSaved, type PaperSaved, readAllSaved, readSavedForPaper } from "@/account/saved-data";
import { inLanguage } from "@/account/saved-lang";
import { getParagraphText } from "@/content";

// What the reader saved: in one paper with `?paper=`, or all of it for the Saved page. With `?lang=es`,
// the Saved page gets the Spanish text of each paragraph.
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const paper = params.get("paper");
  const lang = params.get("lang") === "es" ? "es" : "en";
  return handleReader<AllSaved | PaperSaved>(request, deps, async (token) =>
    paper === null ? inLanguage(await readAllSaved(gateway, token), lang, (paperId, ref) => getParagraphText(paperId, ref, lang)) : readSavedForPaper(gateway, token, paper),
  );
}
