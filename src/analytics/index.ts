import { whenIdle } from "@/lib/when-idle";

// The only file that imports posthog-js. Properties are ids, counts, and labels. Never text.
export type AnalyticsEvents = {
  paper_opened: { paper_id: string };
  home_passage_shown: { ref: string; position: number };
  home_read_clicked: undefined;
  paragraph_picked: { paper_id: string };
  paragraph_shared: { ref: string; method: "sheet" | "copy" };
  audio_started: { paper_id: string; from: "bar" | "paragraph" };
  audio_finished_paper: { paper_id: string; speed: number };
  audio_failed: { paper_id: string };
  navigator_opened: { paper_id: string };
  navigator_used: { kind: "section" | "paper" | "reference" };
};

type Args<E extends keyof AnalyticsEvents> = AnalyticsEvents[E] extends undefined ? [] : [AnalyticsEvents[E]];
type Client = { capture(event: string, properties?: object): unknown };

let started = false;
let client: Client | null = null;
const waiting: [string, object | undefined][] = [];

// Off until NEXT_PUBLIC_POSTHOG_KEY is set. Cookieless: state stays in memory for one page session.
// PostHog loads after the page is idle. Events that arrive earlier wait in a queue.
export function initAnalytics(): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (started || !key || typeof window === "undefined") return;
  started = true;
  whenIdle(async () => {
    const { default: posthog } = await import("posthog-js");
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      persistence: "memory",
      autocapture: false,
      capture_pageview: "history_change",
      disable_session_recording: true,
      // Step 1 uses no feature flags. This also stops a config request to a host that the CSP does not permit.
      advanced_disable_flags: true,
      disable_external_dependency_loading: true,
    });
    posthog.register({ app: "hub-v2" });
    client = posthog;
    for (const [event, properties] of waiting.splice(0)) posthog.capture(event, properties);
  });
}

export function track<E extends keyof AnalyticsEvents>(event: E, ...props: Args<E>): void {
  if (!started) return;
  if (client) client.capture(event, props[0]);
  else waiting.push([event, props[0]]);
}
