#!/usr/bin/env bash

set -Eeuo pipefail

: "${IMAGE_NAME:?IMAGE_NAME is required}"
: "${POCKETBASE_IMAGE:?POCKETBASE_IMAGE is required}"
: "${WORKER_IMAGE:?WORKER_IMAGE is required}"

DEPLOY_DIR="${DEPLOY_DIR:-/root/goldridr}"
COMPOSE_FILE="$DEPLOY_DIR/compose.production.yaml"
RELEASE_FILE="$DEPLOY_DIR/.deployed-image"
POCKETBASE_RELEASE_FILE="$DEPLOY_DIR/.deployed-pocketbase-image"
WORKER_RELEASE_FILE="$DEPLOY_DIR/.deployed-worker-image"

cd "$DEPLOY_DIR"

install -d -o 1001 -g 1001 "$DEPLOY_DIR/data" "$DEPLOY_DIR/.next-cache"
install -d -o 1000 -g 1000 "$DEPLOY_DIR/pocketbase-data"

if [[ ! -f .env ]]; then
  echo "Missing $DEPLOY_DIR/.env" >&2
  exit 1
fi

if ! grep -qx 'POCKETBASE_URL=http://pocketbase:8090' .env; then
  echo "Set POCKETBASE_URL=http://pocketbase:8090 in $DEPLOY_DIR/.env" >&2
  exit 1
fi

previous_image=""
previous_pocketbase_image=""
previous_worker_image=""
if [[ -f "$RELEASE_FILE" ]]; then
  previous_image="$(<"$RELEASE_FILE")"
fi
if [[ -f "$POCKETBASE_RELEASE_FILE" ]]; then
  previous_pocketbase_image="$(<"$POCKETBASE_RELEASE_FILE")"
fi
if [[ -f "$WORKER_RELEASE_FILE" ]]; then
  previous_worker_image="$(<"$WORKER_RELEASE_FILE")"
fi

persist_release_images() {
  local temporary
  temporary="$(mktemp "$DEPLOY_DIR/.env.XXXXXX")"
  awk -v web="$IMAGE_NAME" -v pocketbase="$POCKETBASE_IMAGE" -v worker="$WORKER_IMAGE" '
    BEGIN { web_seen = pocketbase_seen = worker_seen = 0 }
    index($0, "IMAGE_NAME=") == 1 {
      if (!web_seen) print "IMAGE_NAME=" web
      web_seen = 1
      next
    }
    index($0, "POCKETBASE_IMAGE=") == 1 {
      if (!pocketbase_seen) print "POCKETBASE_IMAGE=" pocketbase
      pocketbase_seen = 1
      next
    }
    index($0, "WORKER_IMAGE=") == 1 {
      if (!worker_seen) print "WORKER_IMAGE=" worker
      worker_seen = 1
      next
    }
    { print }
    END {
      if (!web_seen) print "IMAGE_NAME=" web
      if (!pocketbase_seen) print "POCKETBASE_IMAGE=" pocketbase
      if (!worker_seen) print "WORKER_IMAGE=" worker
    }
  ' .env > "$temporary"
  chmod --reference=.env "$temporary"
  chown --reference=.env "$temporary"
  mv "$temporary" .env
}

rollback_release() {
  if [[ -n "$previous_image" && -n "$previous_pocketbase_image" ]]; then
    echo "Rolling back the previous release" >&2
    export IMAGE_NAME="$previous_image"
    export POCKETBASE_IMAGE="$previous_pocketbase_image"
    if [[ -n "$previous_worker_image" ]]; then
      export WORKER_IMAGE="$previous_worker_image"
      if docker compose --env-file .env -f "$COMPOSE_FILE" up -d --remove-orphans pocketbase web notifications-worker; then
        persist_release_images
      fi
    else
      docker compose --env-file .env -f "$COMPOSE_FILE" up -d --remove-orphans pocketbase web || true
      docker compose --env-file .env -f "$COMPOSE_FILE" stop notifications-worker || true
    fi
  fi
}

export IMAGE_NAME POCKETBASE_IMAGE WORKER_IMAGE
docker compose --env-file .env -f "$COMPOSE_FILE" config --quiet
docker compose --env-file .env -f "$COMPOSE_FILE" pull pocketbase web notifications-worker
if ! docker compose --env-file .env -f "$COMPOSE_FILE" up -d --remove-orphans --wait --wait-timeout 90 pocketbase web notifications-worker; then
  docker compose --env-file .env -f "$COMPOSE_FILE" logs --tail=100 pocketbase web notifications-worker >&2
  rollback_release
  exit 1
fi

container_id="$(docker compose --env-file .env -f "$COMPOSE_FILE" ps -q web)"
status=""

for _ in {1..30}; do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")"
  if [[ "$status" == "healthy" ]]; then
    persist_release_images
    printf '%s\n' "$IMAGE_NAME" > "$RELEASE_FILE"
    printf '%s\n' "$POCKETBASE_IMAGE" > "$POCKETBASE_RELEASE_FILE"
    printf '%s\n' "$WORKER_IMAGE" > "$WORKER_RELEASE_FILE"
    echo "Deployed web, PocketBase, and notification worker"
    exit 0
  fi
  if [[ "$status" == "unhealthy" || "$status" == "exited" || "$status" == "dead" ]]; then
    break
  fi
  sleep 2
done

echo "Deployment health check failed with status: ${status:-unknown}" >&2
docker compose --env-file .env -f "$COMPOSE_FILE" logs --tail=100 pocketbase web notifications-worker >&2

rollback_release

exit 1
