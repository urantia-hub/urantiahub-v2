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
  search_opened: undefined;
  search_started: { source: "typed" | "starter" | "recent" | "navigator" };
  search_direct_hit: { kind: "reference" | "paper" };
  search_results_shown: { kind: "words" | "question"; exact: "0" | "1-5" | "6-50" | "51+" };
  search_result_opened: { group: "exact" | "related"; position: number };
  terms_opened: { paper_id: string; names: "0" | "1-3" | "4+"; ideas: "0" | "1-5" | "6+" };
  term_opened: { kind: string; term: string };
  // What a signed-in reader saves. The paper only: never a reference, and never the text of a note.
  bookmark_added: { paper_id: string };
  bookmark_removed: { paper_id: string };
  note_saved: { paper_id: string; kind: "new" | "change" };
  note_deleted: { paper_id: string };
  // The passages near in meaning to a paragraph. Counts and labels only: no reference, no text.
  parallels_opened: { paper_id: string; outside: "0" | "1-5" | "6+"; papers: "0" | "1-5" | "6+" };
  parallels_tab: { tab: "outside" | "papers" };
  parallels_study_opened: { paper_id: string };
  parallel_opened: { kind: "outside" | "papers" };
  navigator_opened: { paper_id: string };
  navigator_used: { kind: "section" | "paper" | "reference" | "contents" };
};

type Args<E extends keyof AnalyticsEvents> = AnalyticsEvents[E] extends undefined ? [] : [AnalyticsEvents[E]];
type Client = { capture(event: string, properties?: object): unknown };

let started = false;
let client: Client | null = null;
const waiting: [string, object | undefined][] = [];
// A reader with a blocker never loads PostHog. The wait list must not grow for the whole visit.
const MAX_WAITING = 50;
let failed = false;

// Off until NEXT_PUBLIC_POSTHOG_KEY is set. Cookieless: state stays in memory for one page session.
// PostHog loads after the page is idle. Events that arrive earlier wait in a queue.
export function initAnalytics(): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (started || !key || typeof window === "undefined") return;
  // A reader can tell each site not to track them. Then nothing starts, and each event is dropped.
  const signals = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (signals.doNotTrack === "1" || signals.globalPrivacyControl === true) return;
  started = true;
  whenIdle(() => {
    // Blocked, or offline. Analytics is not needed to read: stay quiet and keep nothing.
    start(key).catch(() => {
      failed = true;
      waiting.length = 0;
    });
  });
}

type Bags = { event?: string; properties?: Record<string, unknown>; $set?: Record<string, unknown>; $set_once?: Record<string, unknown> };
type Cut = (text: string) => string;

// A search address in plain form, and inside another address in encoded form. The same for the Saved
// page, whose address can name one paragraph: /saved?ref=1:0.3.
const cutSearchText: Cut = (text) =>
  text.replace(/\/(search|saved|parallels)\?[^#\s]*/g, "/$1").replace(/%2F(search|saved|parallels)%3F(?:[^&#\s%]|%(?!26|23))*/gi, "%2F$1");

// The address of a paper can name a paragraph after "#". A count of a saved thing holds the paper only.
// The same for the parallels of a paragraph: their events promise no reference.
const SAVED_EVENTS = new Set(["bookmark_added", "bookmark_removed", "note_saved", "note_deleted", "parallels_opened", "parallels_tab", "parallel_opened"]);
const cutParagraph: Cut = (text) => cutSearchText(text).replace(/(\/papers\/[^#\s?]*(?:\?[^#\s]*)?)#[^\s]*/g, "$1");

function scrubValue(value: unknown, cut: Cut): unknown {
  if (typeof value === "string") return cut(value);
  if (Array.isArray(value)) return value.map((inner) => scrubValue(inner, cut));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([name, inner]) => [cut(name), scrubValue(inner, cut)]));
  }
  return value;
}

// The typed text of a search is in its address: /search?q=... PostHog records the address of each page,
// the address before it, and the first address of a visit. This cuts the text from each one, at each depth.
export function scrubSearchText<E extends Bags | null>(event: E): E {
  if (!event) return event;
  const cut = event.event !== undefined && SAVED_EVENTS.has(event.event) ? cutParagraph : cutSearchText;
  for (const bag of ["properties", "$set", "$set_once"] as const) {
    if (event[bag]) event[bag] = scrubValue(event[bag], cut) as Record<string, unknown>;
  }
  return event;
}

async function start(key: string): Promise<void> {
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
    // A heatmap uses the page address as a key, and a search address holds the typed text.
    capture_heatmaps: false,
    before_send: (event) => scrubSearchText(event),
  });
  posthog.register({ app: "hub-v2" });
  client = posthog;
  for (const [event, properties] of waiting.splice(0)) posthog.capture(event, properties);
}

export function track<E extends keyof AnalyticsEvents>(event: E, ...props: Args<E>): void {
  if (!started || failed) return;
  if (client) client.capture(event, props[0]);
  else if (waiting.length < MAX_WAITING) waiting.push([event, props[0]]);
}
