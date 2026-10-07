@AGENTS.md

# urantiahub-v2

The new UrantiaHub: a reader for the Urantia Papers. Step 1 is the public reader.
Spec and plans: `docs/superpowers/`.

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
