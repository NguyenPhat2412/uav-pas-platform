#!/bin/sh
# Disposable-only PostgreSQL volume/restart/backup/restore and MinIO object replay.
# Required: T17_PG_PASSWORD, T17_MINIO_USER, T17_MINIO_PASSWORD.
# Optional: T17_BUCKET, T17_PG_PORT, T17_MINIO_PORT, T17_MINIO_CONSOLE_PORT, T17_REPO_ROOT, T17_WORK_DIR.
set -eu
: "${T17_PG_PASSWORD:?set T17_PG_PASSWORD to a disposable value}"
: "${T17_MINIO_USER:?set T17_MINIO_USER to a disposable value}"
: "${T17_MINIO_PASSWORD:?set T17_MINIO_PASSWORD to a disposable value}"
REPO_ROOT=${T17_REPO_ROOT:-$(pwd)}
WORK_DIR=${T17_WORK_DIR:-$REPO_ROOT/work/m6-t17-replay}
RUN_ID=${T17_RUN_ID:-$(date +%s)}
PG_PORT=${T17_PG_PORT:-55445}
MINIO_PORT=${T17_MINIO_PORT:-9016}
MINIO_CONSOLE_PORT=${T17_MINIO_CONSOLE_PORT:-9017}
BUCKET=${T17_BUCKET:-uav-t17-media}
PG="uav-m6-t17-postgres-$RUN_ID"
MINIO="uav-m6-t17-minio-$RUN_ID"
PGVOL="uav-m6-t17-pgdata-$RUN_ID"
MINIOVOL="uav-m6-t17-miniodata-$RUN_ID"
MC_HOME="$WORK_DIR/mc"
OBJECT="$WORK_DIR/object.bin"
OBJECT_BACKUP="$WORK_DIR/object-backup.bin"
DUMP="$WORK_DIR/db.dump"
cleanup() {
  docker rm -f "$PG" "$MINIO" >/dev/null 2>&1 || true
  docker volume rm "$PGVOL" "$MINIOVOL" >/dev/null 2>&1 || true
}
trap cleanup EXIT
mkdir -p "$MC_HOME"
printf 'UAV PAS T17 synthetic media object\n' > "$OBJECT"
BYTES=$(wc -c < "$OBJECT" | tr -d ' ')

docker run -d --name "$PG" -e POSTGRES_DB=uav_stabilization -e POSTGRES_USER=uav_test -e POSTGRES_PASSWORD="$T17_PG_PASSWORD" -p "127.0.0.1:$PG_PORT:5432" -v "$PGVOL":/var/lib/postgresql/data postgres:16-alpine >/dev/null
docker run -d --name "$MINIO" -e MINIO_ROOT_USER="$T17_MINIO_USER" -e MINIO_ROOT_PASSWORD="$T17_MINIO_PASSWORD" -p "127.0.0.1:$MINIO_PORT:9000" -p "127.0.0.1:$MINIO_CONSOLE_PORT:9001" -v "$MINIOVOL":/data minio/minio:latest server /data --console-address ':9001' >/dev/null
for i in $(seq 1 45); do pg_isready -h 127.0.0.1 -p "$PG_PORT" -U uav_test -d uav_stabilization >/dev/null 2>&1 && break; sleep 1; done
curl -fsS "http://127.0.0.1:$MINIO_PORT/minio/health/ready" >/dev/null
cat "$REPO_ROOT/backend/src/main/resources/db/migration/V1__baseline_uav_pas.sql" | docker exec -i "$PG" psql -U uav_test -d uav_stabilization >/dev/null
cat "$REPO_ROOT/backend/src/main/resources/db/migration/V2__media_confirmation_inventory_requests.sql" | docker exec -i "$PG" psql -U uav_test -d uav_stabilization >/dev/null
docker exec "$PG" psql -U uav_test -d uav_stabilization -v ON_ERROR_STOP=1 -c "INSERT INTO media_assets (size, storage_provider, object_key, original_name, content_type, type, confirmed, deleted) VALUES ($BYTES, 'MINIO', 'missions/t17/synthetic.bin', 'synthetic.bin', 'application/octet-stream', 'OUTPUT', true, false);" >/dev/null
MC="docker run --rm --network host -v $MC_HOME:/tmp/.mc -v $WORK_DIR:/work --entrypoint mc minio/minio:latest"
$MC alias set t17 "http://127.0.0.1:$MINIO_PORT" "$T17_MINIO_USER" "$T17_MINIO_PASSWORD" >/dev/null
$MC mb --ignore-existing "t17/$BUCKET" >/dev/null
$MC cp /work/object.bin "t17/$BUCKET/missions/t17/synthetic.bin" >/dev/null
sha_before=$($MC cat "t17/$BUCKET/missions/t17/synthetic.bin" | shasum -a 256 | awk '{print $1}')
$MC cp "t17/$BUCKET/missions/t17/synthetic.bin" /work/object-backup.bin >/dev/null
docker exec "$PG" pg_dump -U uav_test -Fc -d uav_stabilization > "$DUMP"
docker cp "$DUMP" "$PG":/tmp/t17-db.dump >/dev/null
docker exec "$PG" createdb -U uav_test uav_restore
docker exec "$PG" pg_restore -U uav_test -d uav_restore /tmp/t17-db.dump >/dev/null
pg_restore_count=$(docker exec "$PG" psql -U uav_test -d uav_restore -At -c "SELECT count(*) FROM media_assets WHERE object_key='missions/t17/synthetic.bin';")
docker restart "$PG" >/dev/null
for i in $(seq 1 45); do pg_isready -h 127.0.0.1 -p "$PG_PORT" -U uav_test -d uav_stabilization >/dev/null 2>&1 && break; sleep 1; done
restart_count=$(docker exec "$PG" psql -U uav_test -d uav_stabilization -At -c "SELECT count(*) FROM media_assets WHERE object_key='missions/t17/synthetic.bin';")
docker restart "$MINIO" >/dev/null
for i in $(seq 1 45); do curl -fsS "http://127.0.0.1:$MINIO_PORT/minio/health/ready" >/dev/null 2>&1 && break; sleep 1; done
sha_restart=$($MC cat "t17/$BUCKET/missions/t17/synthetic.bin" | shasum -a 256 | awk '{print $1}')
$MC rm --recursive --force "t17/$BUCKET" >/dev/null
$MC mb --ignore-existing "t17/$BUCKET" >/dev/null
$MC cp /work/object-backup.bin "t17/$BUCKET/missions/t17/synthetic.bin" >/dev/null
sha_restore=$($MC cat "t17/$BUCKET/missions/t17/synthetic.bin" | shasum -a 256 | awk '{print $1}')
printf 'pg_restore_count=%s\nrestart_count=%s\nsha_before=%s\nsha_restart=%s\nsha_restore=%s\n' "$pg_restore_count" "$restart_count" "$sha_before" "$sha_restart" "$sha_restore"
[ "$pg_restore_count" = 1 ] && [ "$restart_count" = 1 ] && [ "$sha_before" = "$sha_restart" ] && [ "$sha_before" = "$sha_restore" ]
