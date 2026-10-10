import { SHARE_SIZE, shareImage } from "@/seo/share-image";

export const alt = "The Urantia Papers on UrantiaHub";
export const size = SHARE_SIZE;
export const contentType = "image/png";

// The image of each page that has none of its own.
export default function Image() {
  return shareImage("The foreword and 196 papers", "The Urantia Papers");
}
