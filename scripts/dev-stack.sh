#!/usr/bin/env bash
# Full local stack: PostgreSQL (Docker) → Drizzle schema → seed → API (8080) → Vite Egypt Advocates site (5173).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=scripts/load-root-env.sh
source "$(dirname "$0")/load-root-env.sh"

DEFAULT_DATABASE_URL="${DEFAULT_DATABASE_URL:-postgresql://ea:eadev@127.0.0.1:5432/eadev}"
export DATABASE_URL="${DATABASE_URL:-$DEFAULT_DATABASE_URL}"
export SESSION_SECRET="${SESSION_SECRET:-ea-dev-session-secret-change-me}"
API_PORT="${API_PORT:-8080}"
WEB_PORT="${WEB_PORT:-5173}"
export API_PROXY_TARGET="${API_PROXY_TARGET:-http://127.0.0.1:${API_PORT}}"

docker_ok() {
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

use_compose_pg=0
if [[ "${DATABASE_URL}" == "${DEFAULT_DATABASE_URL}" ]]; then
  use_compose_pg=1
fi

if [[ "${use_compose_pg}" == "1" ]]; then
  if [[ "${SKIP_DOCKER:-}" == "1" ]]; then
    echo "SKIP_DOCKER=1 but DATABASE_URL is still the default compose URL. Set DATABASE_URL to your Postgres." >&2
    exit 1
  fi
  if ! docker_ok; then
    cat >&2 <<'EOF'
Cannot connect to Docker. The default DATABASE_URL expects PostgreSQL from docker compose.

  • Start Docker Desktop (or the Docker daemon), then run:  pnpm dev
  • Or skip Docker entirely: set DATABASE_URL to any Postgres you control, then:
      export DATABASE_URL='postgresql://USER:PASS@localhost:5432/mydb'
      pnpm dev:no-docker

EOF
    exit 1
  fi
  echo "Starting PostgreSQL (docker compose)…"
  docker compose up -d postgres
  for i in $(seq 1 120); do
    if docker compose exec -T postgres pg_isready -U ea -d eadev >/dev/null 2>&1; then
      break
    fi
    if [[ "$i" -eq 120 ]]; then
      echo "PostgreSQL did not become ready in time. Check: docker compose logs postgres" >&2
      exit 1
    fi
    sleep 1
  done
fi

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
