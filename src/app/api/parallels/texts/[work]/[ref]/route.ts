import { getLibrary, getPassageOthers, getPassagePapers, getWorkPage, getWorkPages } from "@/content";
import { handlePassageParallels } from "@/server/library-parallels";

// The parallels of one passage of a work in the Library. Under /api/parallels/, so the rate rule of the firewall holds.
export async function GET(_request: Request, { params }: { params: Promise<{ work: string; ref: string }> }) {
  const { work, ref } = await params;
  return handlePassageParallels(work, ref, { library: getLibrary, pages: getWorkPages, page: getWorkPage, papers: getPassagePapers, others: getPassageOthers });
}
