import { messages } from "@/i18n/messages";
import { pairPicture } from "@/seo/pair-image";
import { SHARE_SIZE } from "@/seo/share-image";

export const alt = messages("es").pair.alt;
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ ref: string; pick: string; b: string }> }) {
  const { ref, pick, b } = await params;
  return pairPicture([ref, pick, b], "es");
}
