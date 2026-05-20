#!/usr/bin/env bash
# Build + deploy to Cloudflare Workers (SPA assets + /api Express backend).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash "$ROOT/scripts/cloudflare-build.sh"

if [[ ! -f artifacts/egypt-advocates/dist/public/index.html ]]; then
  echo "Missing build output after build." >&2
  exit 1
fi

echo ">>> wrangler deploy"
pnpm exec wrangler deploy
