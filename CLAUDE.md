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
- Text from the Papers always comes from the API. Never type a quotation.
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
