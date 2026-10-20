import { SHARE_SIZE, shareImage } from "@/seo/share-image";

export const alt = "How World texts work, on UrantiaHub";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return shareImage("World texts", "How World texts work");
}
