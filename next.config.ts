import type { NextConfig } from "next";
import { securityHeaders } from "./src/security-headers";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // A full build asks the content API for 197 papers. A burst made the API answer 500,
    // so the build asks for a few pages at a time and tries a failed page again.
    // A real API outage still fails the build, and the previous deployment stays live.
    staticGenerationMaxConcurrency: 4,
    staticGenerationRetryCount: 2,
  },
  // The share image reads this font file at request time, so the function bundle must hold it.
  outputFileTracingIncludes: {
    "/papers/[slug]/opengraph-image": ["./node_modules/@fontsource/literata/files/literata-latin-500-normal.woff"],
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
