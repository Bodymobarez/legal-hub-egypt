#!/usr/bin/env bash
# Production build for Cloudflare Workers (frontend static assets + API worker).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export CI="${CI:-true}"

echo ">>> pnpm install"
pnpm install --no-frozen-lockfile

echo ">>> typecheck"
pnpm run typecheck

echo ">>> build frontend"
pnpm --filter @workspace/egypt-advocates build

echo ">>> Cloudflare build ready (deploy with: pnpm run deploy:cloudflare)"
