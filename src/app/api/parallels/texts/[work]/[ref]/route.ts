import type { NextRequest } from "next/server";
import { getLibrary, getParagraphText, getPassageOthers, getPassagePapers, getWorkPage, getWorkPages } from "@/content";
import { langParam } from "@/i18n/lang";
import { handlePassageParallels } from "@/server/library-parallels";

// The parallels of one passage of a work in the Library. Under /api/parallels/, so the rate rule of the firewall holds.
// `?lang=es` gives the paragraphs of the Papers in Spanish.
export async function GET(request: NextRequest, { params }: { params: Promise<{ work: string; ref: string }> }) {
  const { work, ref } = await params;
  const deps = { library: getLibrary, pages: getWorkPages, page: getWorkPage, papers: getPassagePapers, others: getPassageOthers, paragraph: (paperId: string, at: string) => getParagraphText(paperId, at, "es") };
  return handlePassageParallels(work, ref, deps, langParam(request.nextUrl.searchParams.get("lang")));
}
