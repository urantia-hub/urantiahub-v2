import { getLibrary, getWorkPages } from "@/content";
import { pageLabels } from "@/library/labels";
import { SHARE_SIZE, shareImage } from "@/seo/share-image";

export const alt = "A page of World texts on UrantiaHub";
export const size = SHARE_SIZE;
export const contentType = "image/png";

// The page as its heading names it: "The Dhammapada · Chapter 2" above its title.
export default async function Image({ params }: { params: Promise<{ work: string; page: string }> }) {
  const { work: slug, page: key } = await params;
  const work = (await getLibrary()).find((w) => w.slug === slug);
  const pages = work ? await getWorkPages(slug).catch(() => []) : [];
  const page = pages.find((p) => p.key === key);
  if (!work || !page) return shareImage("World texts", work?.title ?? "World texts");
  const { eyebrow, title } = pageLabels(work, page, pages);
  return shareImage(eyebrow, title);
}
