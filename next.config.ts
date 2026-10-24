import type { NextConfig } from "next";
import { MOVED_ADDRESSES, OLD_ADDRESSES } from "./src/old-addresses";
import { securityHeaders } from "./src/security-headers";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The name of this build. "Read offline" renews its copy when the name changes.
  env: { NEXT_PUBLIC_BUILD: process.env.VERCEL_GIT_COMMIT_SHA || "dev" },
  experimental: {
    // Two root layouts, (en) and (es), so an unknown address needs a page of its own.
    globalNotFound: true,
    // A full build asks the content API for 197 papers. A burst made the API answer 500,
    // so the build asks for a few pages at a time and tries a failed page again.
    // A real API outage still fails the build, and the previous deployment stays live.
    staticGenerationMaxConcurrency: 4,
    staticGenerationRetryCount: 2,
  },
  // The share image reads this font file at request time, so the function bundle must hold it.
  outputFileTracingIncludes: {
    "/papers/[slug]/opengraph-image": ["./node_modules/@fontsource/literata/files/literata-latin-500-normal.woff"],
    "/s/[ref]/opengraph-image": ["./node_modules/@fontsource/literata/files/literata-latin-500-normal.woff"],
    "/s/[ref]/[pick]/opengraph-image": ["./node_modules/@fontsource/literata/files/literata-latin-500-normal.woff"],
  },
  // No link to the Hub before this one breaks.
  async redirects() {
    return [...OLD_ADDRESSES, ...MOVED_ADDRESSES];
  },
  async headers() {
    return [
      {
        // Every route, the root included. Task 15 tests the root as its own case.
        source: "/:path*",
        headers: securityHeaders({
          dev: process.env.NODE_ENV === "development",
          posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        }),
      },
    ];
  },
};

export default nextConfig;
