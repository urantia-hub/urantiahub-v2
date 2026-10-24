import { type LoadText, paragraphText } from "./paragraph-ref";

// The English text of one paragraph, for "Ver en inglés" on a Spanish page. The text changes rarely, so a
// shared cache can keep it for a day.
export async function handleEnglish(ref: string, loadText: LoadText): Promise<Response> {
  const found = await paragraphText(ref, loadText, "en");
  if ("refused" in found) return found.refused;
  return Response.json({ ref, text: found.text }, { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
