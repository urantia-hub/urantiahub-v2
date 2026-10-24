import { paperById } from "@/content/paper-index";
import { idFromSlug } from "@/lib/paper-url";
import { SHARE_SIZE, shareImage } from "@/seo/share-image";

export const alt = "A paper of the Urantia Papers";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const paper = id === null ? undefined : paperById(id);
  return shareImage(paper && paper.id !== "0" ? `The Urantia Papers · Paper ${paper.id}` : "The Urantia Papers", paper?.title ?? "The Urantia Papers");
}
