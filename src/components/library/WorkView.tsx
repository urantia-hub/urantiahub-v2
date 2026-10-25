import Link from "next/link";
import type { ReactNode } from "react";
import type { LibraryWork, WorkPage, WorkPassage } from "@/content/library";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { textsHref } from "@/i18n/paths";
import { pageLabels, unitCount } from "@/library/labels";
import { refId } from "@/library/refs";
import { outsideHref } from "@/server/parallels";

// A work of one page has this view on the page of the work: `head` takes the place of the title, `after`
// follows the text, and it has no pager.
// A Spanish page says that the text is English, and marks each passage `lang="en"`.
type Props = { work: LibraryWork; page: WorkPage; pages: WorkPage[]; passages: WorkPassage[]; head?: ReactNode; after?: ReactNode; lang?: Lang };

// One page of a work: the form of a paper page. A passage is plain text, with its number as a link to itself.
export function WorkView({ work, page, pages, passages, head, after, lang = "en" }: Props) {
  const t = messages(lang).texts;
  const { eyebrow, title } = pageLabels(work, page, pages);
  const at = pages.findIndex((p) => p.key === page.key);
  const previous = pages[at - 1];
  const next = pages[at + 1];
  // The page of the source, with no words to find: the first passage is the top of this page.
  const source = outsideHref(passages[0]?.url?.split("#")[0] ?? null);
  const href = (p: WorkPage) => textsHref(lang, work.slug, p.key);

  return (
    <article className="paper work" data-work={work.slug}>
      {head ?? (
        <>
          <header className="paper-head">
            <p className="eyebrow">{eyebrow}</p>
            <h1 id="paper-top">{title}</h1>
          </header>
          <p className="work-meta">
            {work.byline} · {unitCount(passages.length, work.unitLabel, lang)}
            {source && (
              <>
                {" · "}
                <a href={source} target="_blank" rel="noopener noreferrer">
                  {t.atSource}
                </a>
              </>
            )}
          </p>
        </>
      )}
      {lang !== "en" && <p className="work-lang">{t.englishText}</p>}

      {passages.map((p) => (
        <p className="para" id={refId(p.ref)} data-ref={p.ref} key={p.ref} lang={lang === "en" ? undefined : "en"}>
          <span className="refline">
            <a className="ref" href={`#${refId(p.ref)}`}>
              {p.number}
            </a>
          </span>
          <span className="text">{p.text}</span>
        </p>
      ))}

      {after && <div className="work-extras">{after}</div>}

      {!head && (
        <nav className="pager" aria-label={t.pagesLabel}>
          {previous ? (
            <Link href={href(previous)}>
              <small>{t.previous}</small>
              {pageLabels(work, previous, pages).title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link className="next" href={href(next)}>
              <small>{t.next}</small>
              {pageLabels(work, next, pages).title}
            </Link>
          ) : (
            <Link className="next" href={textsHref(lang, work.slug)}>
              <small>{t.contents}</small>
              {work.title}
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}
