import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import { securityHeaders } from "./src/security-headers";

const nextConfig: NextConfig = {
  cacheComponents: true,
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

export default withSentryConfig(nextConfig, {
  org: "urantiahub",
  project: "urantiahub-v2",
  silent: !process.env.CI,
  // Browser events go to our own domain, and the server forwards them.
  tunnelRoute: "/monitoring",
  // The maps go to Sentry and then leave the deployment. Without this they stay public.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
