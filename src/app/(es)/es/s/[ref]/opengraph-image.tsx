import { sharedImageSize, sharedPicture } from "@/seo/SharedPage";

export const alt = "Un párrafo de los Documentos de Urantia";
export const size = sharedImageSize;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ ref: string }> }) {
  return sharedPicture((await params).ref, undefined, "es");
}
