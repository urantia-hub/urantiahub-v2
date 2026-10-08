@AGENTS.md

# urantiahub-v2

The new UrantiaHub: a reader for the Urantia Papers. Step 1 is the public reader.
Spec and plan: kept outside this public repo, in the private `urantia` workspace folder under `docs/superpowers/`.

## Commands

- `bun run dev` — development server
- `bun run test` — unit tests (Vitest)
- `bun run e2e` — browser tests (Playwright) against recorded API data
- `bun run typecheck`, `bun run lint`, `bun run build`
- `bun run sync:index` — rewrite `src/content/paper-index.json` from the live API

## Rules

- Next.js is pinned to 16.3.1. Read `node_modules/next/dist/docs/01-app/` before you use a Next.js API. `proxy.ts` replaces `middleware.ts`. Cache Components are on, so `dynamic`, `dynamicParams`, and `revalidate` route options do not exist.
- Only `src/content/index.ts` imports `@urantia/api`. Only `src/analytics/index.ts` imports `posthog-js`.
- No test file under `src/app/`.
- This repo is public. No secret or DSN in the code.
- Text from the Papers always comes from the API. Never type a quotation. The one place where the repo holds text is `src/content/passages.ts`: a home passage is one or more whole sentences of a paragraph, copied from the API response, and the build fails if it differs from the API by one character (`excerptPassage`).
- The Hub's own copy makes no belief statement and no claim about the text.
- `SITE_INDEXABLE` stays off until the cutover to www.
- Paragraph references use the `--ref` token (darker than `--muted`), which meets WCAG AA. Kelson's rule: the design wins over a contrast score, so a change to `--ref` is a design decision, not a compliance one.
- `CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" bun run lighthouse` on this Mac. Lighthouse does not find Chrome without it.
- PostHog loads after the page load, when the browser is idle (`src/lib/when-idle.ts`). A static import of it in client code puts it back on the path to the first paint and fails the Lighthouse gate.
- No error-report vendor. Kelson removed Sentry on 2026-10-07: static pages, no accounts, Vercel keeps the server logs. If browser errors must be seen later, use PostHog error capture, not a second vendor.
- The Lighthouse performance gate is 0.90, not 0.95. The text face keeps its optical-size axis (a 109 KiB file, about 57 KiB more than without it) because the headings look finer with it, and Kelson chose the design. Without the axis the paper page scores 0.96. Do not drop the axis to raise the score.
- The theme is light by default and dark only by the reader's choice (`src/lib/theme.ts`, `data-theme` on `<html>`). The system setting does not decide. Do not add a `prefers-color-scheme` rule.
- Do not name a CSS class after a Tailwind utility. A class named `contents` removed a whole column (`display: contents`). The browser tests check the column layout.
- Both Literata font calls in `src/app/layout.tsx` give the family name "Literata", so the true italic is picked by the browser. Only the upright face is preloaded.
- The mark is a bookmark (`src/brand/BookmarkMark.tsx`). The icon files in `src/app/` and `public/` are written by `bun run icons` from that one shape. Do not edit them by hand. No concentric circles, and no mark shared with urantia.dev.
- Three colors, three meanings. Yellow (`--mark`) is the paragraph in focus. Green (`--voice`, `--voice-line`) shows only while sound plays or loads: a pause removes it. Indigo (`--accent`) is links and the reading position.
- A paragraph is server HTML. No component exists for each paragraph. `ReadingNav` marks paragraphs with the attributes `data-picked` and `data-voice` through one click listener, and sets `data-reader` on `<html>` when it owns the marks. Before that, and with no JavaScript, CSS `:target` marks the paragraph.
- One voice: `nova`. The content gateway reads its URL from the API (`novaAudio`). No code builds an audio URL. A paper with one paragraph that has no audio gets no round button.
- Icons are family B (`src/components/icons.tsx`): tool icons are a line of 1.9 with round ends and a label below; player icons are solid. Check each new icon on one sheet with the full set, because two icons can look alike. The action for keeping a place is "Bookmark". There is no "Highlight".
- Browser tests serve a silent MP3 file in place of each CDN audio file (`e2e/audio.ts`). No test loads audio from the CDN.
- A change of the pill's job must call `setHidden(false)`. The page scrolls down to follow the voice, so without it a pause hides the controls.
- The navigator lists the sections of this paper only. "All papers" goes to the contents page, which shows a "Continue" card from `src/reader/last-read.ts` (this browser only, no account). The theme control is an icon in the header and a text link in the footer, not in the navigator.
- Search (`/search`): the server runs both searches through the content gateway and keeps each result (`searchExact`, `searchRelated`). The browser never calls the API, so the security policy has no API host.
- A search snippet is a list of text parts from `src/search/snippet.ts`. React renders the marks. No snippet reaches the page as an HTML string.
- `/search` stays out of each search engine: a `noindex` meta at each index setting, and a `Disallow` in `robots.txt`.
- Analytics never sends the typed text of a search. Events carry labels and count ranges, and `scrubSearchText` cuts the text from each address that PostHog records.
- The starter questions in `src/search/starters.ts` are approved copy. Before a question enters the pool, run it against the live search and read its first results. The reader sees one from each group, chosen before the first paint.
- Request-time content arrives as a stream, and a stream needs JavaScript to show. So search results need JavaScript. With none, `/search` gives a plain form, and the proxy sends a reference to its paper.
- The fixture server answers a search from `e2e/fixtures/search_*.json` and `semantic_*.json`. Other text gets an empty result, and the text "fail related" makes the semantic search fail.
- The server records each search with `logSearch` (`src/server/search-log.ts`): the text, the kind, and the counts, under one fixed name, with no link to a reader. The browser never sends the text. The Privacy page states both facts: change it when either one changes. The log skips a reader whose browser sends `Sec-GPC: 1` or `DNT: 1`. The browser analytics do not start for that reader (`initAnalytics`). The two must stay in step, because the Privacy page promises both. Its time is the date only, but PostHog also keeps the time of receipt, so the Privacy page makes no promise about time.
- The two search functions use `'use cache: remote'`, because the API has one rate limit for the whole site and each new text costs it two requests. Open before the cutover to www: a rate rule for `/search` in the Vercel firewall.
- Next.js keeps the last pages alive but hidden, with an inline `display: none`. A CSS rule of the form `body:has(.some-page)` then stays true on each later page. Write `:has(.some-page:not([style*="display: none"]))`, and hold it with a browser test that moves between pages by links.
- A link to `/search?q=...` has `prefetch={false}`. A prefetch would run the search, and the firewall counts each request with `q` against the limit of 20 searches a minute for each IP address (rule "Rate limit search" in the Vercel firewall).
- A press that starts a search must show the grey rows at once (`useTransition` in `SearchBox`, and the `key` on the results wrapper in the page).
- On a paper page the site header is sticky. It leaves on a scroll down and returns on a small scroll up, with the bottom controls: `ReadingNav` sets `data-bars` and `data-scrolled` on `<html>`, and CSS does the rest. It shows the mark and the name, never the paper title (Kelson, 2026-10-08).
- The reader settings (`ReaderSettings`, the sliders icon) hold the theme and the text size, and later translation and parallels. They show on a paper page only. Other pages keep the moon icon.
- The text size is a step from 0 to 4 (`src/lib/text-size.ts`). It sets `--reader-scale`, which sizes `.paper` only. A start script applies it before the first paint, as for the theme.
- An element with `backdrop-filter` or `transform` becomes the frame for its `position: fixed` children. The header has a blur, so a sheet that opens from it must be a child of the page body (`createPortal`).
- The Privacy page is built from lists in `src/content/privacy.ts`: the companies that handle data (`VENDORS`), the things kept in the browser (`BROWSER_ITEMS`), the date, the contact address, and the company that runs the site (Adams Technologies LLC). A new vendor or a new stored item is one entry there, with a new date. Each statement on the page must be true of the live code, and the page makes no promise about the future. A lawyer must read it before accounts go live.
