#!/usr/bin/env bash
# Netlify production build (monorepo + pnpm). Used when UI build command overrides netlify.toml.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export CI=true
export NPM_CONFIG_USER_AGENT="pnpm/10.33.2"

echo ">>> Node $(node -v) npm $(npm -v)"
if command -v pnpm >/dev/null 2>&1; then
  echo ">>> pnpm $(pnpm -v)"
else
  echo ">>> Installing pnpm…"
  npm install -g pnpm@10.33.2
  echo ">>> pnpm $(pnpm -v)"
fi

echo ">>> pnpm install"
pnpm install --no-frozen-lockfile

echo ">>> build frontend"
pnpm --filter @workspace/egypt-advocates build

echo ">>> build API function"
pnpm run build:netlify-api

echo ">>> done"
