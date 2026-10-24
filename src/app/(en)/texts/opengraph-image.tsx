import { getLibrary } from "@/content";
import { SHORT_NAMES } from "@/library/header-back";
import { SHARE_SIZE, textsImage } from "@/seo/share-image";

export const alt = "World texts on UrantiaHub";
export const size = SHARE_SIZE;
export const contentType = "image/png";

// The short name of each work, the scriptures first, as the page lists them.
export default async function Image() {
  const works = await getLibrary();
  const ordered = [...works.filter((w) => w.kind === "scripture"), ...works.filter((w) => w.kind !== "scripture")];
  const kicker = works.some((w) => w.slug === "bible") ? `The Bible and ${works.length - 1} other texts` : `${works.length} texts`;
  return textsImage(kicker, ordered.map((w) => SHORT_NAMES[w.slug] ?? w.title));
}
