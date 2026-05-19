#!/usr/bin/env bash
# Netlify production build (monorepo + pnpm). Used by netlify.toml.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export CI=true
export NPM_CONFIG_USER_AGENT="pnpm/10.33.2"

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@10.33.2 --activate
  else
    npm install -g pnpm@10.33.2
  fi
fi

pnpm install --no-frozen-lockfile
pnpm --filter @workspace/egypt-advocates build
pnpm run build:netlify-api
