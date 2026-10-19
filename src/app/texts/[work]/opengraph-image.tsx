import { getLibrary } from "@/content";
import { SHARE_SIZE, shareImage } from "@/seo/share-image";

export const alt = "A work of World texts on UrantiaHub";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ work: string }> }) {
  const { work: slug } = await params;
  const work = (await getLibrary()).find((w) => w.slug === slug);
  return shareImage(work ? `${work.tradition} · ${work.byline}` : "World texts", work?.title ?? "World texts");
}
