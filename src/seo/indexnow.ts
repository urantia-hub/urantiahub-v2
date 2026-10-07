import { absoluteUrl, site } from "@/site";

type Options = { fetchImpl?: typeof fetch };

// Tells IndexNow engines (Bing and others, not Google) that URLs changed. Off until the site is indexable.
export async function submitToIndexNow(urls: string[], { fetchImpl = fetch }: Options = {}): Promise<"sent" | "skipped"> {
  const key = process.env.INDEXNOW_KEY;
  if (!site.indexable || !key || urls.length === 0) return "skipped";

  const response = await fetchImpl("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(site.origin).host,
      key,
      keyLocation: absoluteUrl("/indexnow-key.txt"),
      urlList: urls,
    }),
  });
  if (!response.ok) throw new Error(`IndexNow answered ${response.status}`);
  return "sent";
}
