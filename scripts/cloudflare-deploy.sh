#!/usr/bin/env bash
# Deploy static site to Cloudflare (Workers + Assets).
# Cloudflare Pages: set Deploy command to: bash scripts/cloudflare-deploy.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f artifacts/egypt-advocates/dist/public/index.html ]]; then
  echo "Missing build output. Run: pnpm run build" >&2
  exit 1
fi

pnpm exec wrangler deploy
