#!/usr/bin/env bash
# One-command production deploy (local Netlify CLI must be logged in).
# Monorepo: Netlify CLI needs --filter to skip the interactive app picker.
# Lambda lives at repo root under netlify/functions — pass absolute path.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
pnpm install --no-frozen-lockfile
pnpm --filter @workspace/egypt-advocates build
pnpm run build:netlify-api
exec netlify deploy --prod --no-build \
  --site 9a900a5a-4eff-4d03-9977-c830b9139997 \
  --filter "@workspace/egypt-advocates" \
  --dir "$ROOT/artifacts/egypt-advocates/dist/public" \
  --functions "$ROOT/netlify/functions" \
  "$@"
