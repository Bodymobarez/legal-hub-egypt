#!/usr/bin/env bash
# Netlify production build (monorepo + pnpm).
set -eo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export CI=true
export NPM_CONFIG_USER_AGENT="pnpm/10.33.2"

run_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    pnpm "$@"
  elif command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@10.33.2 --activate
    pnpm "$@"
  else
    npx --yes pnpm@10.33.2 "$@"
  fi
}

echo ">>> Node $(node -v)"
run_pnpm -v

echo ">>> pnpm install"
run_pnpm install --no-frozen-lockfile

echo ">>> build frontend"
run_pnpm --filter @workspace/egypt-advocates build

echo ">>> build API function"
run_pnpm run build:netlify-api

echo ">>> done"
