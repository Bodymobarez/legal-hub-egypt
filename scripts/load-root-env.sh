# Source from repo-root scripts after `ROOT=...` and `cd "$ROOT"`.
# Loads `.env` so DATABASE_URL / SESSION_SECRET can live in one place (gitignored).

if [[ -f "${ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT}/.env"
  set +a
fi
