import { NextResponse, type NextRequest } from "next/server";
import { paperById, referenceHref } from "@/content/paper-index";
import { idFromSlug, parseReference } from "@/lib/paper-url";
import { normalizeQuery } from "@/search/query";

// Two jobs. A paper URL that is not canonical goes to the canonical one, and the query string stays.
// A search for a reference goes to the paper, so that it works with no JavaScript.
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/search") {
    const ref = parseReference(normalizeQuery(request.nextUrl.searchParams.get("q") ?? undefined));
    return ref && paperById(ref.paperId) ? NextResponse.redirect(new URL(referenceHref(ref), request.url), 307) : NextResponse.next();
  }

  let slug: string;
  try {
    slug = decodeURIComponent(request.nextUrl.pathname.slice("/papers/".length));
  } catch {
    // A malformed escape is not a paper. Next.js answers 500 if it reaches the route,
    // so send it to a path with no page: the not-found page answers 404.
    return NextResponse.rewrite(new URL("/not-found", request.url));
  }
  const id = idFromSlug(slug);
  const paper = id === null ? undefined : paperById(id);
  if (!paper || paper.slug === slug) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/papers/${paper.slug}`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/papers/:slug", "/search"],
};
