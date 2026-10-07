import Link from "next/link";
import type { PaperDoc } from "@/content/fetchers";
import { PAPERS, paperPath, partNumeral } from "@/content/paper-index";
import { MissingReferenceNotice } from "./MissingReferenceNotice";
import { ReferenceLink } from "./ReferenceLink";

export function paperEyebrow(paper: { id: string; partId: string }): string | null {
  return paper.id === "0" ? null : `Part ${partNumeral(paper.partId)} · Paper ${paper.id}`;
}

export function PaperView({ paper }: { paper: PaperDoc }) {
  const n = Number(paper.id);
  const previous = n > 0 ? PAPERS[n - 1] : null;
  const next = n < PAPERS.length - 1 ? PAPERS[n + 1] : null;
  const eyebrow = paperEyebrow(paper);

  return (
    <article className="paper">
      <header className="paper-head">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 id="paper-top">{paper.title}</h1>
      </header>
      <MissingReferenceNotice paperId={paper.id} />

      {paper.sections.map((section) => (
        <section key={section.id}>
          {section.id !== "0" && (
            <h2 className="sec" id={`${paper.id}:${section.id}`}>
              <span className="num">{section.id}.</span> {section.title}
            </h2>
          )}
          {section.paragraphs.map((p) => (
            <p className="para" id={p.ref} key={p.ref}>
              <ReferenceLink reference={p.ref} />
              {/* The HTML passed the allow-list in the content gateway. */}
              <span dangerouslySetInnerHTML={{ __html: p.html }} />
            </p>
          ))}
        </section>
      ))}

      <nav className="pager" aria-label="Papers">
        {previous ? (
          <Link href={paperPath(previous.id)}>
            <small>Previous</small>
            {previous.id === "0" ? previous.title : `Paper ${previous.id} · ${previous.title}`}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link className="next" href={paperPath(next.id)}>
            <small>Next</small>
            Paper {next.id} · {next.title}
          </Link>
        )}
      </nav>
    </article>
  );
}
