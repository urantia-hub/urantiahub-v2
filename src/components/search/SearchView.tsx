import Link from "next/link";
import { headers } from "next/headers";
import { after } from "next/server";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { ResultLink } from "@/components/search/ResultLink";
import { SearchBox } from "@/components/search/SearchBox";
import { ShownTracker } from "@/components/search/ShownTracker";
import { searchExact, searchRelated, type SearchHit } from "@/content";
import { referenceHref } from "@/content/paper-index";
import { type Lang, numberIn } from "@/i18n/lang";
import { messages, type Messages } from "@/i18n/messages";
import { contentsHref, searchHref } from "@/i18n/paths";
import { parseReference } from "@/lib/paper-url";
import { isQuestion, normalizeQuery, SPANISH_RELATED } from "@/search/query";
import { settle, type Outcome } from "@/search/settle";
import { exactSnippet, isCut, relatedSnippet, wholeParagraph, type Part } from "@/search/snippet";
import { asksForNoTracking, logSearch } from "@/server/search-log";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>>; lang: Lang };
type Kind = "exact" | "related";

const SHOWN = 5;
const LIST = 20;
const LAST_PAGE = 50;
const label = (t: Messages, kind: Kind) => (kind === "exact" ? t.searchMatches : t.searchRelated);
// The number of matches in the form of the page's language.
const count = (lang: Lang, n: number) => numberIn(lang)(n);

// The search screen of each language: `/search` and `/es/buscar`.
export function SearchView({ searchParams, lang }: Props) {
  return (
    <div className="search">
      {/* The address decides the content, so it renders for each request and arrives as a stream. */}
      <Suspense fallback={<SearchShell lang={lang} />}>
        <SearchContent searchParams={searchParams} lang={lang} />
      </Suspense>
    </div>
  );
}

// What shows before the stream arrives: an empty bar, so the page does not jump.
// A stream needs JavaScript to show, so a reader with no JavaScript gets a plain form here.
// That form still works for a reference: the server sends it to its paper.
function SearchShell({ lang }: { lang: Lang }) {
  const t = messages(lang);
  return (
    <div className="search-box">
      <div className="search-bar shell" aria-hidden="true" />
      <noscript>
        <form className="search-bar" role="search" action={searchHref(lang)} method="get">
          <Link className="icon-button" href={lang === "es" ? "/es" : "/"} aria-label={t.searchBack}>
            <Icon name="back" />
          </Link>
          <input
            type="search"
            name="q"
            aria-label={t.searchField}
            placeholder={t.searchPlaceholder}
            autoComplete="off"
            autoCapitalize="off"
            maxLength={200}
          />
        </form>
        <p className="search-wrap search-empty">{t.searchNoScript}</p>
      </noscript>
    </div>
  );
}

async function SearchContent({ searchParams, lang }: Props) {
  const t = messages(lang);
  const params = await searchParams;
  const q = normalizeQuery(params.q);
  const page = Math.min(LAST_PAGE, Math.max(1, Math.floor(Number(params.page)) || 1));
  // Read here, in the part that renders for each request. The code that runs after the response cannot read it.
  const record = !asksForNoTracking(await headers());
  return (
    <>
      {/* The key gives the box a new state for each new search. */}
      <SearchBox initial={q} key={q} lang={lang} />
      {q !== "" && (
        // The key gives each search its own waiting rows. Without it, the page keeps the old results in view
        // until the new ones are complete.
        <div className="search-wrap results" key={`${q}:${params.all === "exact" ? page : ""}`}>
          {params.all === "exact" ? <AllExact q={q} page={page} lang={lang} /> : <TwoGroups q={q} record={record} lang={lang} />}
        </div>
      )}
      {/* This screen has no site header, so this is the way to the list for a reader who wants to look around. */}
      <p className="search-wrap search-browse">
        <Link href={contentsHref(lang)}>
          <Icon name="list" />
          {t.searchBrowse}
        </Link>
      </p>
    </>
  );
}

function hitHref(hit: SearchHit, lang: Lang): string {
  const ref = parseReference(hit.ref);
  return ref ? referenceHref(ref, lang) : contentsHref(lang);
}
// The snippet, and the whole paragraph when the snippet is cut.
function texts(hit: SearchHit, kind: Kind): { parts: Part[]; whole?: Part[] } {
  const parts = kind === "exact" ? exactSnippet(hit.html) : relatedSnippet(hit.html);
  return isCut(parts) ? { parts, whole: wholeParagraph(hit.html, kind === "exact") } : { parts };
}

// "Did you mean …?" when the search read a word as another word. The link searches the words it read.
function DidYouMean({ words, lang }: { words?: string; lang: Lang }) {
  if (!words) return null;
  return (
    <p className="search-dym">
      {messages(lang).searchDidYouMean}{" "}
      <Link prefetch={false} href={searchHref(lang, words)}>
        {words}
      </Link>
      ?
    </p>
  );
}

const bucket = (total: number) => (total === 0 ? "0" : total <= 5 ? "1-5" : total <= 50 ? "6-50" : "51+");

function TwoGroups({ q, record, lang }: { q: string; record: boolean; lang: Lang }) {
  // Both searches start now. Each group waits for what it needs, so one slow search does not hold the other.
  const exact = settle(searchExact(q, 0, 8, lang));
  const related = settle(searchRelated(q, lang));
  const question = isQuestion(q);
  // After the page is sent: one record of the search, with no link to the reader.
  after(async () => {
    if (!record) return;
    const [e, r] = await Promise.all([exact, related]);
    await logSearch({ query: q, kind: question ? "question" : "words", exact: e.ok ? e.page.total : -1, related: r.ok ? r.page.hits.length : -1 });
  });
  const both: Kind[] = question ? ["related", "exact"] : ["exact", "related"];
  const order = lang === "es" && !SPANISH_RELATED ? both.filter((kind) => kind === "exact") : both;
  const outcome = { exact, related };
  return (
    <>
      {order.map((kind, i) => (
        <section key={kind} aria-label={label(messages(lang), kind)}>
          <Suspense fallback={<Waiting kind={kind} lang={lang} />}>
            <Group kind={kind} q={q} own={outcome[kind]} before={i === 1 ? outcome[order[0]] : null} question={question} lang={lang} />
          </Suspense>
        </section>
      ))}
    </>
  );
}

function Waiting({ kind, lang }: { kind: Kind; lang: Lang }) {
  const t = messages(lang);
  return (
    <>
      <h2 className="search-label">{label(t, kind)}</h2>
      <div className="waiting" role="status" aria-label={t.searchSearching}>
        <span />
        <span />
        <span />
      </div>
    </>
  );
}

type GroupProps = { kind: Kind; q: string; own: Promise<Outcome>; before: Promise<Outcome> | null; question: boolean; lang: Lang };

async function Group({ kind, q, own, before, question, lang }: GroupProps) {
  const t = messages(lang);
  const [mine, first] = await Promise.all([own, before]);
  if (!mine.ok) {
    return (
      <>
        <h2 className="search-label">{label(t, kind)}</h2>
        <p className="search-empty">
          {t.searchFailed} <a href={searchHref(lang, q)}>{t.tryAgain}</a>
        </p>
      </>
    );
  }
  // A paragraph shows one time: the second group leaves out what the first group shows.
  const shownAbove = new Set(first?.ok ? first.page.hits.slice(0, SHOWN).map((hit) => hit.ref) : []);
  const hits = mine.page.hits.filter((hit) => !shownAbove.has(hit.ref)).slice(0, SHOWN);
  const { total } = mine.page;
  return (
    <>
      <h2 className="search-label">
        {label(t, kind)}
        {kind === "exact" && <em>{count(lang, total)}</em>}
      </h2>
      {kind === "exact" && <ShownTracker kind={question ? "question" : "words"} exact={bucket(total)} />}
      {kind === "exact" && <DidYouMean words={mine.page.didYouMean} lang={lang} />}
      {hits.map((hit, i) => (
        <ResultLink
          key={hit.ref}
          href={hitHref(hit, lang)}
          {...texts(hit, kind)}
          close={kind === "exact" && hit.close}
          reference={hit.ref}
          paper={t.searchPaperName(hit.paperId, hit.paperTitle)}
          lang={lang}
          group={kind}
          position={i + 1}
        />
      ))}
      {hits.length === 0 && (
        <p className="search-empty">
          {kind === "related" ? t.searchNoRelated : mine.page.hits.length > 0 ? t.searchAbove : t.searchNone}
        </p>
      )}
      {kind === "exact" && total > SHOWN && (
        <Link className="search-more" prefetch={false} href={`${searchHref(lang, q)}&all=exact`}>
          {t.searchAll(count(lang, total))}
        </Link>
      )}
    </>
  );
}

async function AllExact({ q, page, lang }: { q: string; page: number; lang: Lang }) {
  const t = messages(lang);
  const outcome = await settle(searchExact(q, page - 1, LIST, lang));
  const address = (n: number) => `${searchHref(lang, q)}&all=exact${n > 1 ? `&page=${n}` : ""}`;
  if (!outcome.ok) {
    return (
      <section aria-label={t.searchMatches}>
        <h2 className="search-label">{t.searchMatches}</h2>
        <p className="search-empty">
          {t.searchFailed} <a href={address(page)}>{t.tryAgain}</a>
        </p>
      </section>
    );
  }
  const { hits, total, didYouMean } = outcome.page;
  const pages = Math.min(LAST_PAGE, Math.ceil(total / LIST));
  return (
    <section aria-label={t.searchMatches}>
      <h2 className="search-label">
        {t.searchMatches}
        <em>
          {count(lang, total)}
          {pages > 1 ? t.searchPageOf(Math.min(page, pages), pages) : ""}
        </em>
      </h2>
      <DidYouMean words={didYouMean} lang={lang} />
      {hits.map((hit, i) => (
        <ResultLink
          key={hit.ref}
          href={hitHref(hit, lang)}
          {...texts(hit, "exact")}
          close={hit.close}
          reference={hit.ref}
          paper={t.searchPaperName(hit.paperId, hit.paperTitle)}
          lang={lang}
          group="exact"
          position={Math.min(20, i + 1)}
        />
      ))}
      {hits.length === 0 && <p className="search-empty">{t.searchNoMore}</p>}
      <nav className="search-pages" aria-label={t.searchPages}>
        {page > 1 ? (
          <Link prefetch={false} href={address(page - 1)}>
            {t.previous}
          </Link>
        ) : (
          <span />
        )}
        <Link prefetch={false} href={searchHref(lang, q)}>
          {t.searchBothGroups}
        </Link>
        {page < pages ? (
          <Link prefetch={false} href={address(page + 1)}>
            {t.next}
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </section>
  );
}
