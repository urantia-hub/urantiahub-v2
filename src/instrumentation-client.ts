import * as Sentry from "@sentry/nextjs";
import { initAnalytics } from "@/analytics";

// The browser can read only NEXT_PUBLIC_ variables. A bare VERCEL_ENV here compiles to undefined.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NEXT_PUBLIC_VERCEL_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0,
});

// Next.js runs this file before the app hydrates, so the first event of a page is not lost.
initAnalytics();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
