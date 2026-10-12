import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cutWords } from "@/reader/share-link";
import { pageMetadata } from "./metadata";
import { SHARE_SIZE, sharedImage, shareImage } from "./share-image";
import { sharedPassage } from "./shared";

export const sharedImageSize = SHARE_SIZE;

// The card of a shared link in a chat: the shared words, not the start of the paper.
export async function sharedMetadata(refPart: string, pickPart?: string): Promise<Metadata> {
  const shared = await sharedPassage(refPart, pickPart);
  if (!shared || "go" in shared) return {};
  return {
    ...pageMetadata({ title: `${shared.ref} · ${shared.paperTitle}`, description: `“${cutWords(shared.words, 180)}”`, path: shared.path, type: "article", ownImage: true }),
    // The paper is the page for a search engine. This address is for a person who got a link.
    robots: { index: false, follow: true },
  };
}

export async function sharedPicture(refPart: string, pickPart?: string) {
  const shared = await sharedPassage(refPart, pickPart);
  if (!shared || "go" in shared) return shareImage("The foreword and 196 papers", "The Urantia Papers");
  return sharedImage(shared.words, shared.ref);
}

// A person who opens the link goes to the paragraph in its paper at once. A chat app reads the card and
// stays here. With no JavaScript the words and a link show.
export async function SharedPage({ refPart, pickPart }: { refPart: string; pickPart?: string }) {
  const shared = await sharedPassage(refPart, pickPart);
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
          Read it in the paper
        </a>
      </p>
    </div>
  );
}
