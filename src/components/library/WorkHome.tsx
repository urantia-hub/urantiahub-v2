import Link from "next/link";
import { Icon } from "@/components/icons";
import type { LibraryWork, WorkPair } from "@/content/library";
import { paperById, referenceHref } from "@/content/paper-index";
import { sectionAt } from "@/content/section-index";
import { WorkContinue } from "./WorkContinue";
import type { WorkContents } from "@/library/contents";
import { textPlaceScript } from "@/library/text-places";
import { parseReference } from "@/lib/paper-url";

const paragraphHref = (ref: string) => {
  const parsed = parseReference(ref);
  return parsed ? referenceHref(parsed) : "/papers";
};

type Head = { work: LibraryWork; facts: string[]; source: string | null; start: string | null };

// The top of the page of a work: what it is, who translated it, and the way into its text.
export function WorkHead({ work, facts, source, start }: Head) {
  return (
    <header className="work-head">
      <p className="eyebrow">
        {work.tradition} · {work.kind === "scripture" ? "Scripture" : "Classic"}
      </p>
      <h1 id="paper-top">{work.title}</h1>
      {work.summary && <p className="work-summary">{work.summary}</p>}
      <p className="work-meta">
        {[work.byline, ...facts].join(" · ")}
        {source && (
          <>
            {" · "}
            <a href={source} target="_blank" rel="noopener noreferrer">
              Read at the source
            </a>
          </>
        )}
      </p>
      {start && (
        // Both ways are in the HTML: the script marks the page before its first paint, and CSS shows one.
        <div className="work-way">
          <script dangerouslySetInnerHTML={{ __html: textPlaceScript(work.slug) }} />
          <WorkContinue slug={work.slug} start={start} />
          <Link className="work-start" href={start}>
            Start reading
            <Icon name="arrow" />
          </Link>
        </div>
      )}
    </header>
  );
}

const SUBS = { list: null, grid: "The chapters have no titles, so they show by number.", books: "Open a book to see its pages. The number beside a book is its count of pages." };

function Contents({ work, contents }: { work: LibraryWork; contents: Exclude<WorkContents, { kind: "single" }> }) {
  const href = (key: string) => `/texts/${work.slug}/${key}`;
  const sub = contents.kind === "books" ? SUBS.books.replaceAll("pages", `${contents.unit}s`) : SUBS[contents.kind];
  return (
    <section className="work-block" aria-labelledby="work-contents">
      <h2 id="work-contents">{contents.kind === "books" ? "Books" : "Contents"}</h2>
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
export function WorkExtras({ work, pairs, source }: { work: LibraryWork; pairs: WorkPair[]; source: string | null }) {
  const [paperId, sectionId] = work.urantiaSection?.split(":") ?? [];
  const section = paperId ? sectionAt(paperId, sectionId) : undefined;
  return (
    <>
      {pairs.length > 0 && (
        <section className="work-block" aria-labelledby="work-near">
          <h2 id="work-near">Nearest to the Papers</h2>
          <p className="work-sub">The passages of this work and the paragraphs of the Papers that are nearest to each other in meaning, as the API compares them.</p>
          <ul className="work-pairs">
            {pairs.map((p) => (
              <li key={`${p.ref} ${p.paragraph.ref}`}>
                <a href={`/texts/${work.slug}/at/${encodeURIComponent(p.ref)}`}>
                  <span className="row">
                    {p.ref}
                    <span>{p.percent}%</span>
                  </span>
                  <span className="txt">{p.text}</span>
                </a>
                <Link className="to" href={paragraphHref(p.paragraph.ref)}>
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
          <Link className="work-in-papers" href={referenceHref({ paperId, sectionId })}>
            <span>
              <small>In the Papers</small>
              {work.urantiaSection} {section.title}, in {paperById(paperId)?.title}
            </span>
            <Icon name="paperAfter" />
          </Link>
        </section>
      )}
      <section className="work-block" aria-labelledby="work-edition">
        <h2 id="work-edition">This edition</h2>
        <dl className="work-facts">
          <dt>Translator</dt>
          <dd>{work.translator}</dd>
          {work.year && (
            <>
              <dt>Year</dt>
              <dd>{work.year}</dd>
            </>
          )}
          <dt>Tradition</dt>
          <dd>{work.tradition}</dd>
          <dt>Rights</dt>
          <dd>Public domain in the United States</dd>
          {source && (
            <>
              <dt>Source</dt>
              <dd>
                <a href={source} target="_blank" rel="noopener noreferrer">
                  Read at the source
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
  return (
    <div className="work-home" data-work={head.work.slug}>
      <WorkHead {...head} />
      <hr className="work-rule" />
      <Contents work={head.work} contents={contents} />
      <WorkExtras work={head.work} pairs={pairs} source={head.source} />
    </div>
  );
}
