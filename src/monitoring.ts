import { whenIdle } from "@/lib/when-idle";

// Browser error reports. Sentry loads after the page is idle, so it is not on the path to the first paint.
// The browser can read only NEXT_PUBLIC_ variables. A bare VERCEL_ENV here compiles to undefined.
export function initMonitoring(): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (process.env.NEXT_PUBLIC_VERCEL_ENV !== "production" || !dsn || typeof window === "undefined") return;
  whenIdle(async () => {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({ dsn, tracesSampleRate: 0 });
  });
}

// Sends one error. It does nothing where Sentry is off.
export function reportError(error: unknown): void {
  void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error)).catch(() => undefined);
}
