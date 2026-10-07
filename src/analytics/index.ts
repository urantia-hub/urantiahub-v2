import posthog from "posthog-js";

// The only file that imports posthog-js. Properties are ids, counts, and labels. Never text.
export type AnalyticsEvents = {
  paper_opened: { paper_id: string };
  home_passage_shown: { ref: string };
  home_read_clicked: undefined;
  reference_link_copied: { ref: string };
  navigator_opened: { paper_id: string };
  navigator_used: { kind: "section" | "paper" | "reference" };
};

type Args<E extends keyof AnalyticsEvents> = AnalyticsEvents[E] extends undefined ? [] : [AnalyticsEvents[E]];

let ready = false;

// Off until NEXT_PUBLIC_POSTHOG_KEY is set. Cookieless: state stays in memory for one page session.
export function initAnalytics(): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (ready || !key || typeof window === "undefined") return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    persistence: "memory",
    autocapture: false,
    capture_pageview: "history_change",
    disable_session_recording: true,
    disable_external_dependency_loading: true,
  });
  posthog.register({ app: "hub-v2" });
  ready = true;
}

export function track<E extends keyof AnalyticsEvents>(event: E, ...props: Args<E>): void {
  if (!ready) return;
  posthog.capture(event, props[0]);
}
