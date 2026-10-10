import { referenceHref } from "@/content/paper-index";
import { parseReference } from "@/lib/paper-url";

// An address of the old Hub, in its emails: a paragraph by its reference ("1:0.3"). It goes to that paragraph.
export async function GET(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  let parsed = null;
  try {
    parsed = parseReference(decodeURIComponent(ref));
  } catch {
    // The address is not text that a browser can read. It has no paragraph.
  }
  return Response.redirect(new URL(parsed ? referenceHref(parsed) : "/papers", request.url), parsed ? 308 : 307);
}
