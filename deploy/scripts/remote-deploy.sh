#!/usr/bin/env bash
# Idempotent GHCR deployment, health verification, pre-migration DB snapshot, and automatic rollback script.
# Invoked over SSH by .github/workflows/cd-staging-production.yml and .github/workflows/rollback.yml.
set -euo pipefail

ACTION="${1:-deploy}"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
DEPLOY_DIR="${DEPLOY_DIR:-$(pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-${DEPLOY_DIR}/docker-compose.ghcr.yml}"
ENV_FILE="${ENV_FILE:-${DEPLOY_DIR}/.env.${DEPLOY_ENV}}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$([ "$DEPLOY_ENV" = "staging" ] && echo "uav-pas-staging" || echo "uav-pas")}"
READINESS_TIMEOUT_SECONDS="${READINESS_TIMEOUT_SECONDS:-120}"
PRE_DEPLOY_BACKUP="${PRE_DEPLOY_BACKUP:-$([ "$DEPLOY_ENV" = "production" ] && echo "true" || echo "false")}"

CURRENT_STATE_FILE="${DEPLOY_DIR}/.current-release"
LAST_GOOD_STATE_FILE="${DEPLOY_DIR}/.last-good-release"

log() {
  printf '[%s] [%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$DEPLOY_ENV" "$*"
}

fail() {
  printf '[%s] [%s] ERROR: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$DEPLOY_ENV" "$*" >&2
  exit 1
}

# Read a single KEY=VALUE entry from an env file without sourcing or executing shell expansions.
read_env_value() {
  local key="$1"
  local file="$2"
  local default_val="${3:-}"
  if [ ! -f "$file" ]; then
    printf '%s' "$default_val"
    return 0
  fi
  local raw
  raw="$(awk -F= -v k="$key" '
    /^[[:space:]]*#/ || /^[[:space:]]*$/ { next }
    {
      lhs = $1
      sub(/^[[:space:]]+/, "", lhs)
      sub(/[[:space:]]+$/, "", lhs)
      if (lhs == k) {
        val = substr($0, index($0, "=") + 1)
        sub(/^[[:space:]]+/, "", val)
        sub(/[[:space:]]+$/, "", val)
        if ((val ~ /^".*"$/) || (val ~ /^\x27.*\x27$/)) {
          val = substr(val, 2, length(val) - 2)
        }
        found = val
      }
    }
    END { print found }
  ' "$file")"
  if [ -n "$raw" ]; then
    printf '%s' "$raw"
  else
    printf '%s' "$default_val"
  fi
}

[ -f "$COMPOSE_FILE" ] || fail "Compose file not found: $COMPOSE_FILE"
[ -f "$ENV_FILE" ] || fail "Environment file not found: $ENV_FILE (create it on the VPS with chmod 600 before deploying)"
ENV_FILE="$(cd "$(dirname "$ENV_FILE")" && pwd)/$(basename "$ENV_FILE")"
COMPOSE_FILE="$(cd "$(dirname "$COMPOSE_FILE")" && pwd)/$(basename "$COMPOSE_FILE")"
chmod 600 "$ENV_FILE"

DEFAULT_BACKEND_PORT="$( [ "$DEPLOY_ENV" = "staging" ] && echo "28080" || echo "18080" )"
DEFAULT_FRONTEND_PORT="$( [ "$DEPLOY_ENV" = "staging" ] && echo "23100" || echo "13100" )"
DEFAULT_BACKUP_DIR="$( [ "$DEPLOY_ENV" = "staging" ] && echo "/opt/uav-pas-staging/backups" || echo "/opt/uav-pas/backups" )"

BACKEND_PORT="$(read_env_value BACKEND_PORT "$ENV_FILE" "$DEFAULT_BACKEND_PORT")"
FRONTEND_PORT="$(read_env_value FRONTEND_PORT "$ENV_FILE" "$DEFAULT_FRONTEND_PORT")"
POSTGRES_DB="$(read_env_value POSTGRES_DB "$ENV_FILE" "uav_pas")"
POSTGRES_USER="$(read_env_value POSTGRES_USER "$ENV_FILE" "uav_pas")"
BACKUP_HOST_DIR="$(read_env_value BACKUP_HOST_DIR "$ENV_FILE" "$DEFAULT_BACKUP_DIR")"

mkdir -p "$BACKUP_HOST_DIR"
chmod 700 "$BACKUP_HOST_DIR"

if [ -n "${GHCR_TOKEN:-}" ] && [ -n "${GHCR_USERNAME:-}" ]; then
  log "Authenticating with ghcr.io as ${GHCR_USERNAME}..."
  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin >/dev/null
  unset GHCR_TOKEN
fi

compose_cmd() {
  ENV_FILE="$ENV_FILE" \
  COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME" \
  BACKUP_HOST_DIR="$BACKUP_HOST_DIR" \
  BACKEND_PORT="$BACKEND_PORT" \
  FRONTEND_PORT="$FRONTEND_PORT" \
  BACKEND_IMAGE="${BACKEND_IMAGE:-placeholder}" \
  FRONTEND_IMAGE="${FRONTEND_IMAGE:-placeholder}" \
  APP_VERSION="${APP_VERSION:-unknown}" \
  APP_GIT_COMMIT="${APP_GIT_COMMIT:-unknown}" \
  APP_BUILD_TIME="${APP_BUILD_TIME:-unknown}" \
  docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

wait_for_readiness() {
  local deadline=$((SECONDS + READINESS_TIMEOUT_SECONDS))
  local backend_ok="false"
  local frontend_ok="false"

  log "Waiting up to ${READINESS_TIMEOUT_SECONDS}s for backend (127.0.0.1:${BACKEND_PORT}) and frontend (127.0.0.1:${FRONTEND_PORT})..."
  while [ "$SECONDS" -lt "$deadline" ]; do
    local health_json
    health_json="$(curl -fsS --max-time 3 "http://127.0.0.1:${BACKEND_PORT}/actuator/health" 2>/dev/null || true)"
    if printf '%s' "$health_json" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"UP"'; then
      backend_ok="true"
    else
      backend_ok="false"
    fi

    local web_code
    web_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:${FRONTEND_PORT}/" 2>/dev/null || echo "000")"
    if [ "$web_code" = "200" ] || [ "$web_code" = "307" ] || [ "$web_code" = "308" ]; then
      frontend_ok="true"
    else
      frontend_ok="false"
    fi

    if [ "$backend_ok" = "true" ] && [ "$frontend_ok" = "true" ]; then
      log "Readiness verified: backend=UP (:${BACKEND_PORT}), frontend=HTTP ${web_code} (:${FRONTEND_PORT})."
      return 0
    fi
    sleep 3
  done

  log "Readiness timed out (backend_ok=${backend_ok}, frontend_ok=${frontend_ok}). Dumping container diagnostics:"
  compose_cmd ps || true
  compose_cmd logs --tail 60 backend | sed -E 's/(PASSWORD|SECRET|TOKEN|KEY)=[^[:space:]]+/\1=[REDACTED]/gi' || true
  compose_cmd logs --tail 40 frontend || true
  return 1
}

snapshot_running_release() {
  if [ -f "$CURRENT_STATE_FILE" ]; then
    cp -f "$CURRENT_STATE_FILE" "$LAST_GOOD_STATE_FILE"
    chmod 600 "$LAST_GOOD_STATE_FILE"
    return 0
  fi

  local running_backend running_frontend
  running_backend="$(docker inspect --format '{{.Config.Image}}' "$(compose_cmd ps -q backend 2>/dev/null || true)" 2>/dev/null || true)"
  running_frontend="$(docker inspect --format '{{.Config.Image}}' "$(compose_cmd ps -q frontend 2>/dev/null || true)" 2>/dev/null || true)"
  if [ -n "$running_backend" ] && [ -n "$running_frontend" ]; then
    umask 077
    cat > "$LAST_GOOD_STATE_FILE" <<EOF
BACKEND_IMAGE=${running_backend}
FRONTEND_IMAGE=${running_frontend}
APP_VERSION=previous-container
APP_GIT_COMMIT=previous
APP_BUILD_TIME=unknown
SAVED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
  fi
}

write_current_release() {
  umask 077
  cat > "$CURRENT_STATE_FILE" <<EOF
BACKEND_IMAGE=${BACKEND_IMAGE}
FRONTEND_IMAGE=${FRONTEND_IMAGE}
APP_VERSION=${APP_VERSION:-unknown}
APP_GIT_COMMIT=${APP_GIT_COMMIT:-unknown}
APP_BUILD_TIME=${APP_BUILD_TIME:-unknown}
DEPLOYED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
}

pre_deploy_backup() {
  if [ "$PRE_DEPLOY_BACKUP" != "true" ]; then
    return 0
  fi
  local pg_cid
  pg_cid="$(compose_cmd ps -q postgres 2>/dev/null || true)"
  if [ -z "$pg_cid" ]; then
    log "PostgreSQL container is not running yet (initial bootstrap); skipping pre-deploy pg_dump."
    return 0
  fi
  local pg_running
  pg_running="$(docker inspect --format '{{.State.Running}}' "$pg_cid" 2>/dev/null || echo "false")"
  if [ "$pg_running" != "true" ]; then
    log "PostgreSQL container is not in running state; skipping pre-deploy pg_dump."
    return 0
  fi

  local stamp="${APP_GIT_COMMIT:-manual}"
  stamp="${stamp//[^a-zA-Z0-9._-]/}"
  local dump_file="${BACKUP_HOST_DIR}/uav_pas-${DEPLOY_ENV}-predeploy-$(date -u +%Y%m%dT%H%M%SZ)-${stamp}.sql.gz"
  log "Creating pre-migration PostgreSQL backup: ${dump_file}"
  compose_cmd exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "${dump_file}.tmp"
  gzip -t "${dump_file}.tmp"
  mv "${dump_file}.tmp" "$dump_file"
  chmod 600 "$dump_file"
  log "Pre-migration backup verified ($(du -h "$dump_file" | awk '{print $1}'))."
}

restore_last_good() {
  if [ ! -f "$LAST_GOOD_STATE_FILE" ]; then
    log "No .last-good-release file available to auto-rollback."
    return 1
  fi
  BACKEND_IMAGE="$(read_env_value BACKEND_IMAGE "$LAST_GOOD_STATE_FILE" "")"
  FRONTEND_IMAGE="$(read_env_value FRONTEND_IMAGE "$LAST_GOOD_STATE_FILE" "")"
  APP_VERSION="$(read_env_value APP_VERSION "$LAST_GOOD_STATE_FILE" "rollback")"
  APP_GIT_COMMIT="$(read_env_value APP_GIT_COMMIT "$LAST_GOOD_STATE_FILE" "rollback")"
  APP_BUILD_TIME="$(read_env_value APP_BUILD_TIME "$LAST_GOOD_STATE_FILE" "unknown")"

  if [ -z "$BACKEND_IMAGE" ] || [ -z "$FRONTEND_IMAGE" ]; then
    log "Invalid .last-good-release metadata; cannot rollback automatically."
    return 1
  fi

  log "Restoring previous known-good images: backend=${BACKEND_IMAGE}, frontend=${FRONTEND_IMAGE}"
  compose_cmd pull backend frontend || true
  compose_cmd up -d --remove-orphans
  wait_for_readiness
  write_current_release
}

case "$ACTION" in
  deploy)
    [ -n "${BACKEND_IMAGE:-}" ] || fail "BACKEND_IMAGE is required for deploy"
    [ -n "${FRONTEND_IMAGE:-}" ] || fail "FRONTEND_IMAGE is required for deploy"

    log "Starting ${DEPLOY_ENV} deployment (version=${APP_VERSION:-unknown}, commit=${APP_GIT_COMMIT:-unknown})"
    snapshot_running_release
    pre_deploy_backup

    log "Pulling immutable images from GHCR..."
    compose_cmd pull backend frontend

    log "Applying Compose stack (${COMPOSE_PROJECT_NAME})..."
    compose_cmd up -d --remove-orphans

    if ! wait_for_readiness; then
      log "New release failed readiness checks! Triggering automatic rollback..."
      if restore_last_good; then
        fail "Deployment failed readiness checks; automatically rolled back to previous healthy release."
      else
        fail "Deployment failed readiness checks and automatic rollback did not succeed."
      fi
    fi

    write_current_release
    docker image prune -f >/dev/null 2>&1 || true
    log "Deployment to ${DEPLOY_ENV} completed and verified."
    ;;

  rollback)
    ROLLBACK_TARGET="${ROLLBACK_TARGET:-previous}"
    if [ "$ROLLBACK_TARGET" = "previous" ]; then
      restore_last_good || fail "Rollback to previous release failed."
    else
      [ -n "${BACKEND_IMAGE:-}" ] || fail "BACKEND_IMAGE is required when ROLLBACK_TARGET != previous"
      [ -n "${FRONTEND_IMAGE:-}" ] || fail "FRONTEND_IMAGE is required when ROLLBACK_TARGET != previous"
      snapshot_running_release
      log "Rolling back ${DEPLOY_ENV} to explicit target ${ROLLBACK_TARGET}..."
      compose_cmd pull backend frontend
      compose_cmd up -d --remove-orphans
      wait_for_readiness || fail "Explicit rollback target ${ROLLBACK_TARGET} failed readiness checks."
      write_current_release
    fi
    log "Rollback on ${DEPLOY_ENV} completed and verified."
    ;;

  status)
    compose_cmd ps
    if [ -f "$CURRENT_STATE_FILE" ]; then
      log "Current release metadata:"
      cat "$CURRENT_STATE_FILE"
    fi
    ;;

  *)
    fail "Unknown action '${ACTION}'. Expected: deploy | rollback | status"
    ;;
esac
