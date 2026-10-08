"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, useTransition, type FormEvent, type MouseEvent } from "react";
import { track } from "@/analytics";
import { Icon } from "@/components/icons";
import { directHits } from "@/search/direct-hits";
import { normalizeQuery, searchHref } from "@/search/query";
import { clearRecent, readRecent, saveRecent, subscribeToRecent } from "@/search/recent";
import { STARTER_GROUPS } from "@/search/starters";

const NO_RECENT: readonly string[] = [];
const noRecent = () => NO_RECENT;
const never = () => () => {};

// The one box: a reference or a paper title is a direct hit, and other text is a search.
// It is a real form, so it works with no JavaScript. `initial` is the text of the results below it.
export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const starters = useRef<HTMLElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState(initial);
  const recent = useSyncExternalStore(subscribeToRecent, readRecent, noRecent);
  // The server does not know the recent searches. So the lists below the bar show only in the browser:
  // a reader with recent searches must not see the starter questions first.
  const inBrowser = useSyncExternalStore(
    never,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (initial === "") track("search_opened");
  }, [initial]);

  // A mark that the box is ready for input. The browser tests wait for it.
  useEffect(() => {
    if (form.current) form.current.dataset.ready = "";
  }, []);

  const q = normalizeQuery(value);
  const startersShown = inBrowser && q === "" && recent.length === 0;
  // Picks one question in each group at random, before the paint.
  useLayoutEffect(() => {
    if (!startersShown) return;
    starters.current?.querySelectorAll<HTMLElement>(".starter-group").forEach((group) => {
      if (group.dataset.pick === undefined) group.dataset.pick = String(Math.floor(Math.random() * group.children.length));
    });
  }, [startersShown]);
  const hits = directHits(q);
  const isReference = hits[0]?.kind === "reference";
  // On the results page the search already ran for `initial`, so the row shows only after a change.
  const searchRow = q !== "" && !isReference && q !== initial;

  // True from the press until the results page arrives. The reader must see at once that the search runs.
  const [pending, startTransition] = useTransition();

  function run(text: string, source: "typed" | "starter" | "recent") {
    saveRecent(text);
    track("search_started", { source });
    input.current?.blur();
    startTransition(() => router.push(searchHref(text)));
  }

  // A starter question or a recent search. The link still works for a new tab and with no JavaScript.
  function onPick(event: MouseEvent, text: string, source: "starter" | "recent") {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
    event.preventDefault();
    setValue(text);
    run(text, source);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (q === "") return;
    if (isReference) {
      track("search_direct_hit", { kind: "reference" });
      router.push(hits[0].href);
      return;
    }
    run(q, "typed");
  }

  function onBack(event: MouseEvent) {
    if (window.history.length <= 1) return;
    event.preventDefault();
    router.back();
  }

  return (
    <div className="search-box">
      <form className="search-bar" role="search" action="/search" method="get" onSubmit={onSubmit} ref={form}>
        <Link className="icon-button" href="/" aria-label="Back" onClick={onBack}>
          <Icon name="back" />
        </Link>
        <input
          ref={input}
          type="search"
          name="q"
          aria-label="Search the Papers"
          placeholder="Search, ask, or type 99:1.1"
          autoComplete="off"
          autoCapitalize="off"
          enterKeyHint="search"
          maxLength={200}
          // The search screen is for typing. The results page is for reading.
          autoFocus={initial === ""}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        {value !== "" && (
          <button
            type="button"
            className="icon-button"
            aria-label="Clear the field"
            onClick={() => {
              setValue("");
              input.current?.focus();
            }}
          >
            <Icon name="close" />
          </button>
        )}
      </form>

      {pending && (
        <div className="search-wrap">
          <h2 className="search-label">Searching</h2>
          <div className="waiting" role="status" aria-label="Searching">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}
      <div className="search-wrap" hidden={pending}>
        {hits.length > 0 && (
          <section aria-label="Go to">
            <h2 className="search-label">Go to</h2>
            {hits.map((hit) => (
              <Link className="search-row hit" href={hit.href} key={hit.href} onClick={() => track("search_direct_hit", { kind: hit.kind })}>
                <span className="glyph">
                  <Icon name={hit.kind === "reference" ? "arrow" : "page"} />
                </span>
                <span>
                  <b>{hit.title}</b>
                  <small>{hit.detail}</small>
                </span>
              </Link>
            ))}
          </section>
        )}

        {searchRow && (
          <section aria-label="Search">
            <h2 className="search-label">Search</h2>
            <button type="button" className="search-row go" onClick={onSubmit}>
              <span className="glyph">
                <Icon name="search" />
              </span>
              <span>Search the Papers for “{q}”</span>
            </button>
          </section>
        )}

        {inBrowser && q === "" && recent.length > 0 && (
          <section aria-label="Recent">
            <h2 className="search-label">
              Recent
              <button type="button" onClick={clearRecent}>
                Clear
              </button>
            </h2>
            {recent.map((text) => (
              <Link className="search-row" href={searchHref(text)} key={text} prefetch={false} onClick={(event) => onPick(event, text, "recent")}>
                <span className="glyph">
                  <Icon name="clock" />
                </span>
                {text}
              </Link>
            ))}
          </section>
        )}

        {startersShown && (
          <section aria-label="Ask in your own words" ref={starters}>
            <h2 className="search-label">Ask in your own words</h2>
            {STARTER_GROUPS.map((group) => (
              // One question of each group shows. CSS hides the others.
              <div className="starter-group" key={group.name}>
                {group.questions.map((text) => (
                  <Link className="search-row" href={searchHref(text)} key={text} prefetch={false} onClick={(event) => onPick(event, text, "starter")}>
                    <span className="glyph">
                      <Icon name="question" />
                    </span>
                    {text}
                  </Link>
                ))}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
