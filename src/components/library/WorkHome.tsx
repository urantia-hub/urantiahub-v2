import Link from "next/link";
import { Icon } from "@/components/icons";
import type { LibraryWork, WorkPair } from "@/content/library";
import { paperById, referenceHref } from "@/content/paper-index";
import { sectionAt, sectionTitleIn } from "@/content/section-index";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { textsHref } from "@/i18n/paths";
import { WorkContinue } from "./WorkContinue";
import type { WorkContents } from "@/library/contents";
import { plural } from "@/library/labels";
import { textPlaceScript } from "@/library/text-places";
import { parseReference } from "@/lib/paper-url";

const paragraphHref = (ref: string, lang: Lang) => {
  const parsed = parseReference(ref);
  return parsed ? referenceHref(parsed, lang) : lang === "es" ? "/es/documentos" : "/papers";
};

type Head = { work: LibraryWork; facts: string[]; source: string | null; start: string | null; lang?: Lang };

// The top of the page of a work: what it is, who translated it, and the way into its text.
export function WorkHead({ work, facts, source, start, lang = "en" }: Head) {
  const t = messages(lang).texts;
  return (
    <header className="work-head">
      <p className="eyebrow">
        {work.tradition} · {work.kind === "scripture" ? t.scripture : t.classic}
      </p>
      <h1 id="paper-top">{work.title}</h1>
      {work.summary && <p className="work-summary">{work.summary}</p>}
      <p className="work-meta">
        {[work.byline, ...facts].join(" · ")}
        {source && (
          <>
            {" · "}
            <a href={source} target="_blank" rel="noopener noreferrer">
              {t.atSource}
            </a>
          </>
        )}
      </p>
      {start && (
        // Both ways are in the HTML: the script marks the page before its first paint, and CSS shows one.
        <div className="work-way">
          <script dangerouslySetInnerHTML={{ __html: textPlaceScript(work.slug) }} />
          <WorkContinue slug={work.slug} start={start} lang={lang} />
          <Link className="work-start" href={start}>
            {t.start}
            <Icon name="arrow" />
          </Link>
        </div>
      )}
    </header>
  );
}

function Contents({ work, contents, lang }: { work: LibraryWork; contents: Exclude<WorkContents, { kind: "single" }>; lang: Lang }) {
  const t = messages(lang).texts;
  const href = (key: string) => textsHref(lang, work.slug, key);
  const sub = contents.kind === "books" ? t.booksSub(plural(t.unit(contents.unit), lang)) : contents.kind === "grid" ? t.gridSub : null;
  return (
    <section className="work-block" aria-labelledby="work-contents">
      <h2 id="work-contents">{contents.kind === "books" ? t.books : t.contents}</h2>
      {sub && <p className="work-sub">{sub}</p>}
      {contents.kind === "list" && (
        <ol className="work-toc">
          {contents.rows.map((r) => (
            <li key={r.key}>
              <span className="n">{r.number}</span>
              <span>
                <Link href={href(r.key)} data-page={r.key}>
                  {r.title}
                </Link>
                <small>{r.line}</small>
              </span>
            </li>
          ))}
        </ol>
      )}
      {contents.kind === "grid" && (
        <ul className="work-grid">
          {contents.rows.map((r) => (
            <li key={r.key}>
              <Link href={href(r.key)} aria-label={r.title} data-page={r.key}>
                {r.number}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {contents.kind === "books" &&
        contents.parts.map(({ part, books }) => (
          <div className="work-part" key={part}>
            {part && <h3>{part}</h3>}
            <div className="work-books">
              {books.map((b) => (
                <details className="work-book" key={b.code}>
                  <summary>
                    {b.name}
                    <span>{b.numbers.length}</span>
                  </summary>
                  <ul className="work-grid">
                    {b.numbers.map((n) => (
                      <li key={n}>
                        <Link href={href(`${b.base}${n}`)} aria-label={`${b.name} ${n}`} data-page={`${b.base}${n}`}>
                          {n}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </div>
        ))}
    </section>
  );
}

// After the text or the contents: the pairs nearest to the Papers, the section of Paper 131, and the facts of the edition.
// A Spanish page takes `pairs` with the Spanish paragraphs (`pairsIn`).
export function WorkExtras({ work, pairs, source, lang = "en" }: { work: LibraryWork; pairs: WorkPair[]; source: string | null; lang?: Lang }) {
  const t = messages(lang).texts;
  const [paperId, sectionId] = work.urantiaSection?.split(":") ?? [];
  const section = paperId ? sectionAt(paperId, sectionId) : undefined;
  return (
    <>
      {pairs.length > 0 && (
        <section className="work-block" aria-labelledby="work-near">
          <h2 id="work-near">{t.near}</h2>
          <p className="work-sub">{t.nearSub}</p>
          <ul className="work-pairs">
            {pairs.map((p) => (
              <li key={`${p.ref} ${p.paragraph.ref}`}>
                <a href={`${textsHref(lang, work.slug)}/at/${encodeURIComponent(p.ref)}`}>
                  <span className="row">
                    {p.ref}
                    <span>{p.percent}%</span>
                  </span>
                  <span className="txt" lang={lang === "en" ? undefined : "en"}>
                    {p.text}
                  </span>
                </a>
                <Link className="to" href={paragraphHref(p.paragraph.ref, lang)}>
                  <span className="row">
                    {p.paragraph.ref}
                    <span>{p.paragraph.paperTitle}</span>
                  </span>
                  <span className="txt">{p.paragraph.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {section && (
        <section className="work-block">
          <Link className="work-in-papers" href={referenceHref({ paperId, sectionId }, lang)}>
            <span>
              <small>{t.inPapers}</small>
              {t.inPapersLine(work.urantiaSection ?? "", sectionTitleIn(paperId, sectionId, lang) ?? section.title ?? "", paperById(paperId, lang)?.title ?? "")}
            </span>
            <Icon name="paperAfter" />
          </Link>
        </section>
      )}
      <section className="work-block" aria-labelledby="work-edition">
        <h2 id="work-edition">{t.edition}</h2>
        <dl className="work-facts">
          <dt>{t.translator}</dt>
          <dd>{work.translator}</dd>
          {work.year && (
            <>
              <dt>{t.year}</dt>
              <dd>{work.year}</dd>
            </>
          )}
          <dt>{t.tradition}</dt>
          <dd>{work.tradition}</dd>
          <dt>{t.rights}</dt>
          <dd>{t.publicDomain}</dd>
          {source && (
            <>
              <dt>{t.source}</dt>
              <dd>
                <a href={source} target="_blank" rel="noopener noreferrer">
                  {t.atSource}
                </a>
              </dd>
            </>
          )}
        </dl>
      </section>
    </>
  );
}

type Props = Head & { contents: WorkContents; pairs: WorkPair[] };

// The page of a work (`/texts/{work}`): its head, its contents, and what is near it in the Papers.
export function WorkHome({ contents, pairs, ...head }: Props) {
  if (contents.kind === "single") throw new Error("A work of one page shows its text: see the route.");
  const lang = head.lang ?? "en";
  return (
    <div className="work-home" data-work={head.work.slug}>
      <WorkHead {...head} />
      <hr className="work-rule" />
      <Contents work={head.work} contents={contents} lang={lang} />
      <WorkExtras work={head.work} pairs={pairs} source={head.source} lang={lang} />
    </div>
  );
}
