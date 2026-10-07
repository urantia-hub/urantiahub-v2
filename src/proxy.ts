import { NextResponse, type NextRequest } from "next/server";
import { paperById } from "@/content/paper-index";
import { idFromSlug } from "@/lib/paper-url";

// Sends each paper URL that is not canonical to the canonical one. The query string stays.
export function proxy(request: NextRequest) {
  const slug = decodeURIComponent(request.nextUrl.pathname.slice("/papers/".length));
  const id = idFromSlug(slug);
  const paper = id === null ? undefined : paperById(id);
  if (!paper || paper.slug === slug) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/papers/${paper.slug}`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: "/papers/:slug",
};
