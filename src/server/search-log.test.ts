import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load(key = "phc_test") {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", key);
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "");
  return (await import("./search-log")).logSearch;
}
const ok = () => vi.fn().mockResolvedValue({ ok: true });
const body = (fetchImpl: ReturnType<typeof ok>) => JSON.parse(fetchImpl.mock.calls[0][1].body as string);

describe("logSearch", () => {
  it("records the text, the kind, and the counts, with no link to a person", async () => {
    const logSearch = await load();
    const fetchImpl = ok();
    await logSearch({ query: "thought adjuster", kind: "words", exact: 244, related: 5 }, { fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://us.i.posthog.com/capture/");
    expect(body(fetchImpl)).toEqual({
      api_key: "phc_test",
      event: "search_query",
      // One fixed name for each record. No record can be tied to a reader, a visit, or a device.
      distinct_id: "search-log",
      properties: {
        app: "hub-v2",
        query: "thought adjuster",
        kind: "words",
        exact: 244,
        related: 5,
        $process_person_profile: false,
        $geoip_disable: true,
      },
    });
  });

  it("sends no header that can identify the reader", async () => {
    const logSearch = await load();
    const fetchImpl = ok();
    await logSearch({ query: "soul", kind: "words", exact: 1, related: 1 }, { fetchImpl });
    expect(Object.keys(fetchImpl.mock.calls[0][1].headers)).toEqual(["content-type"]);
  });

  it("does nothing with no key", async () => {
    const logSearch = await load("");
    const fetchImpl = ok();
    await logSearch({ query: "soul", kind: "words", exact: 1, related: 1 }, { fetchImpl });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each(["write to me at ana@example.com please", "call 555 123 4567 now", "my number is +1 (415) 555-0100"])(
    "does not record a text that holds an address or a phone number: %s",
    async (query) => {
      const logSearch = await load();
      const fetchImpl = ok();
      await logSearch({ query, kind: "question", exact: 0, related: 5 }, { fetchImpl });
      expect(body(fetchImpl).properties.query).toBe("[removed]");
    },
  );

  it("keeps a reference with numbers, and a year", async () => {
    const logSearch = await load();
    const fetchImpl = ok();
    await logSearch({ query: "the year 1934 and 196 papers", kind: "question", exact: 0, related: 5 }, { fetchImpl });
    expect(body(fetchImpl).properties.query).toBe("the year 1934 and 196 papers");
  });

  it("stays quiet when the request fails", async () => {
    const logSearch = await load();
    await expect(logSearch({ query: "soul", kind: "words", exact: 1, related: 1 }, { fetchImpl: vi.fn().mockRejectedValue(new Error("down")) })).resolves.toBeUndefined();
  });
});
