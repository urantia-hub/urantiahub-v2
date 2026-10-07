import { afterEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn() }));
vi.mock("@sentry/nextjs", () => sentry);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  Object.values(sentry).forEach((fn) => fn.mockClear());
});

async function start(env: Record<string, string>) {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const monitoring = await import("./monitoring");
  monitoring.initMonitoring();
  await new Promise((resolve) => setTimeout(resolve, 20));
  return monitoring;
}

describe("monitoring", () => {
  it("reports from Vercel production with a DSN, and does not trace", async () => {
    await start({ NEXT_PUBLIC_VERCEL_ENV: "production", NEXT_PUBLIC_SENTRY_DSN: "https://k@o1.ingest.sentry.io/1" });
    expect(sentry.init).toHaveBeenCalledWith({ dsn: "https://k@o1.ingest.sentry.io/1", tracesSampleRate: 0 });
  });

  it.each([
    ["a preview deployment", { NEXT_PUBLIC_VERCEL_ENV: "preview", NEXT_PUBLIC_SENTRY_DSN: "https://k@o1.ingest.sentry.io/1" }],
    ["a local clone", { NEXT_PUBLIC_VERCEL_ENV: "", NEXT_PUBLIC_SENTRY_DSN: "https://k@o1.ingest.sentry.io/1" }],
    ["production with no DSN", { NEXT_PUBLIC_VERCEL_ENV: "production", NEXT_PUBLIC_SENTRY_DSN: "" }],
  ])("stays off for %s", async (_name, env) => {
    await start(env);
    expect(sentry.init).not.toHaveBeenCalled();
  });

  it("does not start Sentry in the same task as the page start", async () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://k@o1.ingest.sentry.io/1");
    const { initMonitoring } = await import("./monitoring");
    initMonitoring();
    expect(sentry.init).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(sentry.init).toHaveBeenCalledTimes(1));
  });

  it("passes an error to Sentry", async () => {
    const { reportError } = await import("./monitoring");
    const error = new Error("boom");
    reportError(error);
    await vi.waitFor(() => expect(sentry.captureException).toHaveBeenCalledWith(error));
  });
});
