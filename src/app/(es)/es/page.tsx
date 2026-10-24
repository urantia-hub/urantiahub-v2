import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PARTS_ES, paperPath, partNumeral } from "@/content/paper-index";
import { spanishOn } from "@/i18n/lang";
import { pageMetadata } from "@/seo/metadata";

export function generateMetadata(): Metadata {
  if (!spanishOn()) return {};
  return pageMetadata({
    title: "Los Documentos de Urantia: índice",
    description: "El prólogo y los 196 documentos de Urantia en español, en cuatro partes.",
    path: "/es",
    lang: "es",
    twin: "/papers",
  });
}

// The Spanish contents page. Task B7 gives it the full look of the English one.
export default function SpanishContents() {
  if (!spanishOn()) notFound();
  return (
    <div className="prose es-contents">
      <h1>Documentos</h1>
      {PARTS_ES.map((part) => (
        <section key={part.id}>
          <h2>{part.id === "0" ? part.title : `Parte ${partNumeral(part.id)} · ${part.title}`}</h2>
          <ul>
            {part.papers.map((paper) => (
              <li key={paper.id}>
                <Link href={paperPath(paper.id, "es")}>{paper.id === "0" ? paper.title : `${paper.id}. ${paper.title}`}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
