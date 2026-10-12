import { sharedImageSize, sharedPicture } from "@/seo/SharedPage";

export const alt = "Sentences of a paragraph of the Urantia Papers";
export const size = sharedImageSize;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ ref: string; pick: string }> }) {
  const { ref, pick } = await params;
  return sharedPicture(ref, pick);
}
