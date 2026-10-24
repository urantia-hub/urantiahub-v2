import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { Lang } from "@/i18n/lang";
import { cutWords } from "@/reader/share-link";
import { pageMetadata } from "./metadata";
import { SHARE_SIZE, sharedImage, shareImage } from "./share-image";
import { sharedPassage } from "./shared";

export const sharedImageSize = SHARE_SIZE;

// The card of a shared link in a chat: the shared words, not the start of the paper.
export async function sharedMetadata(refPart: string, pickPart?: string, lang: Lang = "en"): Promise<Metadata> {
  const shared = await sharedPassage(refPart, pickPart, lang);
  if (!shared || "go" in shared) return {};
  return {
    ...pageMetadata({ title: `${shared.ref} · ${shared.paperTitle}`, description: `“${cutWords(shared.words, 180)}”`, path: shared.path, type: "article", ownImage: true, lang }),
    // The paper is the page for a search engine. This address is for a person who got a link.
    robots: { index: false, follow: true },
  };
}

export async function sharedPicture(refPart: string, pickPart?: string, lang: Lang = "en") {
  const shared = await sharedPassage(refPart, pickPart, lang);
  if (!shared || "go" in shared) return lang === "es" ? shareImage("El prólogo y los 196 documentos", "Los Documentos de Urantia") : shareImage("The foreword and 196 papers", "The Urantia Papers");
  return sharedImage(shared.words, shared.ref, lang);
}

// A person who opens the link goes to the paragraph in its paper at once. A chat app reads the card and
// stays here. With no JavaScript the words and a link show.
export async function SharedPage({ refPart, pickPart, lang = "en" }: { refPart: string; pickPart?: string; lang?: Lang }) {
  const shared = await sharedPassage(refPart, pickPart, lang);
  if (!shared) notFound();
  if ("go" in shared) redirect(shared.go);
  return (
    <div className="prose shared-link">
      <script dangerouslySetInnerHTML={{ __html: `location.replace(${JSON.stringify(shared.target).replace(/</g, "\\u003c")})` }} />
      <blockquote>{shared.words}</blockquote>
      <p>
        {shared.ref} · {shared.paperTitle}
      </p>
      <p>
        <a className="btn" href={shared.target}>
          {lang === "es" ? "Leerlo en el documento" : "Read it in the paper"}
        </a>
      </p>
    </div>
  );
}
