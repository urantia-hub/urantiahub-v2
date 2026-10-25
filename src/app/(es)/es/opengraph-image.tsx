import { messages } from "@/i18n/messages";
import { SHARE_SIZE, shareImage } from "@/seo/share-image";

export const alt = messages("es").shareAlt;
export const size = SHARE_SIZE;
export const contentType = "image/png";

// The image of each Spanish page that has none of its own.
export default function Image() {
  const t = messages("es");
  return shareImage(t.shareLead, t.thePapers);
}
