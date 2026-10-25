import { paperById } from "@/content/paper-index";
import { messages } from "@/i18n/messages";
import { idFromSlug } from "@/lib/paper-url";
import { SHARE_SIZE, shareImage } from "@/seo/share-image";

export const alt = "Un documento de los Documentos de Urantia";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = messages("es");
  const id = idFromSlug(slug);
  const paper = id === null ? undefined : paperById(id, "es");
  return shareImage(paper && paper.id !== "0" ? t.paperImageLine(Number(paper.id)) : t.thePapers, paper?.title ?? t.thePapers);
}
