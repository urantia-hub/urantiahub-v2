export type AnalyticsEvents = {
  paper_opened: { paper_id: string };
  home_passage_shown: { ref: string };
  home_read_clicked: undefined;
  reference_link_copied: { ref: string };
  navigator_opened: { paper_id: string };
  navigator_used: { kind: "section" | "paper" | "reference" };
};

type Args<E extends keyof AnalyticsEvents> = AnalyticsEvents[E] extends undefined ? [] : [AnalyticsEvents[E]];

// Task 12 replaces this body with the PostHog call.
export function track<E extends keyof AnalyticsEvents>(_event: E, ..._props: Args<E>): void {}
