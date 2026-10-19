// The addresses of the Hub before this one, and where each goes now, so no old link breaks.
// `permanent` is false where the page of the old address is still to come: a browser must not keep that answer.
// The paper addresses are the same in both, and need no line here.
export type OldAddress = { source: string; destination: string; permanent: boolean };

const to = (destination: string, permanent: boolean, ...sources: string[]): OldAddress[] => sources.map((source) => ({ source, destination, permanent }));

export const OLD_ADDRESSES: OldAddress[] = [
  // The old Hub had the language in each address.
  ...to("/", true, "/en"),
  ...to("/:path*", true, "/en/:path*"),
  ...to("/saved", true, "/my-library", "/my-library/bookmarks"),
  ...to("/papers", true, "/explore", "/more", "/settings", "/settings/interests", "/onboarding/interests"),
  ...to("/papers/:paper", true, "/watch/:paper"),
  ...to("/privacy", true, "/privacy-policy", "/cookie-policy"),
  // The sign-in pages of the old Hub. `/auth/callback` is a route of this Hub and is not in the list.
  ...to("/papers", true, "/auth/sign-in", "/auth/sign-out", "/auth/verify-request", "/auth/error"),
  // A link in an email that a reader still has.
  ...to("/emails", false, "/api/user/unsubscribe"),
  ...to("/terms", true, "/terms-of-service"),
  ...to("/releases", true, "/changelog", "/changelog.xml"),
  ...to("/resources", true, "/community-resources"),
  // This page is to come.
  ...to("/about", false, "/blockchain-archive"),
];

// The addresses that this Hub moved. The Library became World texts on 2026-10-19.
export const MOVED_ADDRESSES: OldAddress[] = [...to("/texts", true, "/library"), ...to("/texts/:path*", true, "/library/:path*")];
