import { pairPicture } from "@/seo/pair-image";
import { SHARE_SIZE } from "@/seo/share-image";

export const alt = "A paragraph of the Urantia Papers and a passage of a world text";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ ref: string; pick: string; b: string; c: string; d: string }> }) {
  const { ref, pick, b, c, d } = await params;
  return pairPicture([ref, pick, b, c, d]);
}
