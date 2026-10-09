#!/usr/bin/env bash
# Builds the app against the recorded API data and serves it on port 3100.
set -euo pipefail

bun e2e/fixture-server.ts &
FIXTURE_PID=$!
trap 'kill "$FIXTURE_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 50); do
  curl -sf http://localhost:4010/papers/1 >/dev/null && break
  sleep 0.2
done

export URANTIA_API_BASE_URL=http://localhost:4010
export PRERENDER_PAPERS=0,1,2,99
export SITE_ORIGIN=http://localhost:3100
export REVALIDATE_SECRET=e2e-secret
# The sign-in runs against the stand-in on the fixture server. This value is for tests only.
export ACCOUNTS_URL=http://localhost:4010
export HUB_APP_SECRET=e2e-only-app-secret-0123456789-abcdefghij
export NEXT_PUBLIC_SIGN_IN=on
# No analytics from a test run.
export NEXT_PUBLIC_POSTHOG_KEY=

bun run build
bunx next start -p 3100
