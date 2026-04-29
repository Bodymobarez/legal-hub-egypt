#!/usr/bin/env bash
# Same stack as dev-stack.sh but never uses Docker — you supply PostgreSQL (local install,
# Postgres.app, cloud Neon/Supabase/RDS, colleague’s server, …).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=scripts/load-root-env.sh
source "$(dirname "$0")/load-root-env.sh"

if [[ -z "${DATABASE_URL:-}" ]]; then
  cat >&2 <<'EOF'
dev-no-docker: set DATABASE_URL to a reachable PostgreSQL instance (Docker not used).

  export SESSION_SECRET='a-long-random-string'   # optional; has a dev default if unset

  Examples:
    export DATABASE_URL='postgresql://USER:PASS@localhost:5432/dbname'

  Local Postgres once (adapt user/db names):
    createuser CREATEDB myuser || true
    createdb -O myuser mydb

  Or create `.env` in the repo root (see `.env.example`) with DATABASE_URL.

Then run:  pnpm dev:no-docker
EOF
  exit 1
fi

export SESSION_SECRET="${SESSION_SECRET:-ea-dev-session-secret-change-me}"
API_PORT="${API_PORT:-8080}"
WEB_PORT="${WEB_PORT:-5173}"
export API_PROXY_TARGET="${API_PROXY_TARGET:-http://127.0.0.1:${API_PORT}}"

echo "Applying Drizzle schema…"
DATABASE_URL="$DATABASE_URL" pnpm --filter @workspace/db run push

echo "Seeding data (idempotent)…"
DATABASE_URL="$DATABASE_URL" pnpm --filter @workspace/scripts run seed

cleanup() {
  if [[ -n "${API_PID:-}" ]] && kill -0 "${API_PID}" 2>/dev/null; then
    kill "${API_PID}" 2>/dev/null || true
    wait "${API_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Building & starting API on port ${API_PORT}…"
(
  export PORT="$API_PORT"
  export DATABASE_URL
  export SESSION_SECRET
  pnpm --filter @workspace/api-server run dev
) &
API_PID=$!

attempts=0
until curl -sf "http://127.0.0.1:${API_PORT}/api/healthz" >/dev/null 2>&1; do
  attempts=$((attempts + 1))
  if [[ "$attempts" -gt 180 ]]; then
    echo "API did not become ready on http://127.0.0.1:${API_PORT}/api/healthz" >&2
    exit 1
  fi
  sleep 0.5
done
echo "API is up."

echo "Starting Egypt Advocates (Vite) on port ${WEB_PORT}…"
export PORT="$WEB_PORT"
export BASE_PATH="${BASE_PATH:-/}"
pnpm --filter @workspace/egypt-advocates dev
