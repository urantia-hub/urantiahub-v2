import Link from "next/link";
import type { PaperDoc } from "@/content/fetchers";
import { PAPERS_BY_LANG, paperById, paperPath, partNumeral } from "@/content/paper-index";
import { type Lang, spanishOn } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { hasOwnNumber } from "@/components/navigation/nav-state";
import { AskPaperButton } from "./AskPaperButton";
import { MissingReferenceNotice } from "./MissingReferenceNotice";
import { OFFER_SCRIPT, SpanishOffer } from "./SpanishOffer";

export function paperEyebrow(paper: { id: string; partId: string }, lang: Lang = "en"): string | null {
  return paper.id === "0" ? null : messages(lang).paperEyebrow(partNumeral(paper.partId), Number(paper.id));
}

export function PaperView({ paper, lang = "en" }: { paper: PaperDoc; lang?: Lang }) {
  const t = messages(lang);
  const papers = PAPERS_BY_LANG[lang];
  const n = Number(paper.id);
  const previous = n > 0 ? papers[n - 1] : null;
  const next = n < papers.length - 1 ? papers[n + 1] : null;
  const eyebrow = paperEyebrow(paper, lang);

  return (
    <article className="paper">
      <header className="paper-head">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 id="paper-top">{paper.title}</h1>
        {lang === "en" && spanishOn() && (
          <>
            <script dangerouslySetInnerHTML={{ __html: OFFER_SCRIPT }} />
            <SpanishOffer href={paperPath(paper.id, "es")} title={paperById(paper.id, "es")?.title ?? ""} />
          </>
        )}
        {/* The assistant in Spanish comes with the rest of the Spanish tools. */}
        {lang === "en" && <AskPaperButton />}
      </header>
      <MissingReferenceNotice paperId={paper.id} />

      {paper.sections.map((section) => (
        <section key={section.id}>
          {section.id !== "0" && (
            <h2 className="sec" id={`${paper.id}:${section.id}`}>
              {!hasOwnNumber(section.title) && <span className="num">{section.id}. </span>}
              {section.title}
            </h2>
          )}
          {section.paragraphs.map((p) => (
            <p className="para" id={p.ref} key={p.ref}>
              {/* A real link, so it works with no JavaScript. With JavaScript, the dock treats a click on it as a tap. */}
              <span className="refline">
                <a className="ref" href={`#${p.ref}`}>
                  {p.ref}
                </a>
                {/* The place for the marks of a signed-in reader. It is empty in the HTML. */}
                <span className="marks" />
              </span>
              {/* The HTML passed the allow-list in the content gateway. */}
              <span className="text" dangerouslySetInnerHTML={{ __html: p.html }} />
            </p>
          ))}
        </section>
      ))}

      <nav className="pager" aria-label={t.papersNav}>
        {previous ? (
          <Link href={paperPath(previous.id, lang)}>
            <small>{t.previous}</small>
            {previous.id === "0" ? previous.title : t.paperNamed(previous.id, previous.title)}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link className="next" href={paperPath(next.id, lang)}>
            <small>{t.next}</small>
            {t.paperNamed(next.id, next.title)}
          </Link>
        )}
      </nav>
    </article>
  );
}
