import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResultLink } from "@/components/search/ResultLink";
import { SearchBox } from "@/components/search/SearchBox";
import { ShownTracker } from "@/components/search/ShownTracker";
import { searchExact, searchRelated, type SearchHit, type SearchPage } from "@/content";
import { referenceHref } from "@/content/paper-index";
import { parseReference } from "@/lib/paper-url";
import { isQuestion, normalizeQuery, searchHref } from "@/search/query";
import { exactSnippet, relatedSnippet } from "@/search/snippet";

// A results page is not a page of the text. It stays out of each search engine, at each index setting.
export const metadata: Metadata = { title: "Search", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type Outcome = { ok: true; page: SearchPage } | { ok: false };
type Kind = "exact" | "related";

const SHOWN = 5;
const LIST = 20;
const LAST_PAGE = 50;
const LABEL: Record<Kind, string> = { exact: "Exact matches", related: "Related passages" };

export default function SearchPage({ searchParams }: Props) {
  return (
    <div className="search">
      {/* The address decides the content, so it renders for each request. The empty screen is the fallback. */}
      <Suspense fallback={<SearchBox initial="" />}>
        <SearchContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchContent({ searchParams }: Props) {
  const params = await searchParams;
  const q = normalizeQuery(params.q);
  const page = Math.min(LAST_PAGE, Math.max(1, Math.floor(Number(params.page)) || 1));
  return (
    <>
      {/* The key gives the box a new state for each new search. */}
      <SearchBox initial={q} key={q} />
      {q !== "" && <div className="search-wrap results">{params.all === "exact" ? <AllExact q={q} page={page} /> : <TwoGroups q={q} />}</div>}
    </>
  );
}

const settle = (promise: Promise<SearchPage>): Promise<Outcome> =>
  promise.then(
    (page): Outcome => ({ ok: true, page }),
    (): Outcome => ({ ok: false }),
  );

function hitHref(hit: SearchHit): string {
  const ref = parseReference(hit.ref);
  return ref ? referenceHref(ref) : "/papers";
}
const paperName = (hit: SearchHit) => (hit.paperId === "0" ? "Foreword" : `Paper ${hit.paperId} · ${hit.paperTitle}`);
const bucket = (total: number) => (total === 0 ? "0" : total <= 5 ? "1-5" : total <= 50 ? "6-50" : "51+");

function TwoGroups({ q }: { q: string }) {
  // Both searches start now. Each group waits for what it needs, so one slow search does not hold the other.
  const exact = settle(searchExact(q));
  const related = settle(searchRelated(q));
  const question = isQuestion(q);
  const order: Kind[] = question ? ["related", "exact"] : ["exact", "related"];
  const outcome = { exact, related };
  return (
    <>
      {order.map((kind, i) => (
        <section key={kind} aria-label={LABEL[kind]}>
          <Suspense fallback={<Waiting kind={kind} />}>
            <Group kind={kind} q={q} own={outcome[kind]} before={i === 1 ? outcome[order[0]] : null} question={question} />
          </Suspense>
        </section>
      ))}
    </>
  );
}

function Waiting({ kind }: { kind: Kind }) {
  return (
    <>
      <h2 className="search-label">{LABEL[kind]}</h2>
      <div className="waiting" role="status" aria-label="Searching">
        <span />
        <span />
        <span />
      </div>
    </>
  );
}

type GroupProps = { kind: Kind; q: string; own: Promise<Outcome>; before: Promise<Outcome> | null; question: boolean };

async function Group({ kind, q, own, before, question }: GroupProps) {
  const [mine, first] = await Promise.all([own, before]);
  if (!mine.ok) {
    return (
      <>
        <h2 className="search-label">{LABEL[kind]}</h2>
        <p className="search-empty">
          The search did not load. <a href={searchHref(q)}>Try again</a>
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
        {LABEL[kind]}
        {kind === "exact" && <em>{total.toLocaleString("en-US")}</em>}
      </h2>
      {kind === "exact" && <ShownTracker kind={question ? "question" : "words"} exact={bucket(total)} />}
      {hits.map((hit, i) => (
        <ResultLink
          key={hit.ref}
          href={hitHref(hit)}
          parts={kind === "exact" ? exactSnippet(hit.html) : relatedSnippet(hit.html)}
          reference={hit.ref}
          paper={paperName(hit)}
          group={kind}
          position={i + 1}
        />
      ))}
      {hits.length === 0 && (
        <p className="search-empty">
          {kind === "related" ? "No related passage." : mine.page.hits.length > 0 ? "The exact matches are in the passages above." : "No paragraph has all of these words."}
        </p>
      )}
      {kind === "exact" && total > SHOWN && (
        <Link className="search-more" href={`${searchHref(q)}&all=exact`}>
          All {total.toLocaleString("en-US")} exact matches
        </Link>
      )}
    </>
  );
}

async function AllExact({ q, page }: { q: string; page: number }) {
  const outcome = await settle(searchExact(q, page - 1, LIST));
  const address = (n: number) => `${searchHref(q)}&all=exact${n > 1 ? `&page=${n}` : ""}`;
  if (!outcome.ok) {
    return (
      <section aria-label={LABEL.exact}>
        <h2 className="search-label">{LABEL.exact}</h2>
        <p className="search-empty">
          The search did not load. <a href={address(page)}>Try again</a>
        </p>
      </section>
    );
  }
  const { hits, total } = outcome.page;
  const pages = Math.min(LAST_PAGE, Math.ceil(total / LIST));
  return (
    <section aria-label={LABEL.exact}>
      <h2 className="search-label">
        {LABEL.exact}
        <em>
          {total.toLocaleString("en-US")}
          {pages > 1 ? ` · page ${page} of ${pages}` : ""}
        </em>
      </h2>
      {hits.map((hit, i) => (
        <ResultLink
          key={hit.ref}
          href={hitHref(hit)}
          parts={exactSnippet(hit.html)}
          reference={hit.ref}
          paper={paperName(hit)}
          group="exact"
          position={Math.min(20, i + 1)}
        />
      ))}
      {hits.length === 0 && <p className="search-empty">No more matches.</p>}
      <nav className="search-pages" aria-label="Pages">
        {page > 1 ? <Link href={address(page - 1)}>Previous</Link> : <span />}
        <Link href={searchHref(q)}>Back to both groups</Link>
        {page < pages ? <Link href={address(page + 1)}>Next</Link> : <span />}
      </nav>
    </section>
  );
}
