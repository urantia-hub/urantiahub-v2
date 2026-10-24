import { sharedImageSize, sharedPicture } from "@/seo/SharedPage";

export const alt = "Frases de un párrafo de los Documentos de Urantia";
export const size = sharedImageSize;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ ref: string; pick: string }> }) {
  const { ref, pick } = await params;
  return sharedPicture(ref, pick, "es");
}
