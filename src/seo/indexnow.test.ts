import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load(env: Record<string, string>) {
  vi.stubEnv("SITE_ORIGIN", "https://www.urantiahub.com");
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return (await import("./indexnow")).submitToIndexNow;
}

describe("submitToIndexNow", () => {
  it("sends nothing when the site is not indexable", async () => {
    const submit = await load({ SITE_INDEXABLE: "", INDEXNOW_KEY: "abc123" });
    const fetchImpl = vi.fn();
    await expect(submit(["https://www.urantiahub.com/"], { fetchImpl })).resolves.toBe("skipped");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends nothing with no key", async () => {
    const submit = await load({ SITE_INDEXABLE: "on", INDEXNOW_KEY: "" });
    const fetchImpl = vi.fn();
    await expect(submit(["https://www.urantiahub.com/"], { fetchImpl })).resolves.toBe("skipped");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends nothing for an empty list", async () => {
    const submit = await load({ SITE_INDEXABLE: "on", INDEXNOW_KEY: "abc123" });
    const fetchImpl = vi.fn();
    await expect(submit([], { fetchImpl })).resolves.toBe("skipped");
  });

  it("posts the URL list with the host, the key, and the key location", async () => {
    const submit = await load({ SITE_INDEXABLE: "on", INDEXNOW_KEY: "abc123" });
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    await expect(submit(["https://www.urantiahub.com/papers"], { fetchImpl })).resolves.toBe("sent");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.indexnow.org/indexnow");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      host: "www.urantiahub.com",
      key: "abc123",
      keyLocation: "https://www.urantiahub.com/indexnow-key.txt",
      urlList: ["https://www.urantiahub.com/papers"],
    });
  });

  it("throws when IndexNow rejects the request", async () => {
    const submit = await load({ SITE_INDEXABLE: "on", INDEXNOW_KEY: "abc123" });
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
    await expect(submit(["https://www.urantiahub.com/"], { fetchImpl })).rejects.toThrow(/403/);
  });
});
