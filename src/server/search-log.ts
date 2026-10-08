type Entry = { query: string; kind: "words" | "question"; exact: number; related: number };
type Options = { fetchImpl?: typeof fetch };

// An email address, or a run of seven or more digits with the usual phone punctuation.
const PERSONAL = /[^\s@]+@[^\s@]+\.[^\s@]+|(?:\d[\s().+-]*){7,}/;

// One record for each search: what was asked and how much came back. It tells us what readers look for.
// It has no link to a reader. The server sends it, so PostHog gets no address, no visit, and no device of
// the reader, and each record has the same fixed name. A count of -1 means that the search failed.
export async function logSearch({ query, kind, exact, related }: Entry, { fetchImpl = fetch }: Options = {}): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  try {
    await fetchImpl(`${host}/capture/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event: "search_query",
        distinct_id: "search-log",
        properties: {
          app: "hub-v2",
          // A reader can type a contact detail by mistake. Such a text is not kept.
          query: PERSONAL.test(query) ? "[removed]" : query,
          kind,
          exact,
          related,
          $process_person_profile: false,
          $geoip_disable: true,
        },
      }),
    });
  } catch {
    // The log is not needed to search. Stay quiet.
  }
}
