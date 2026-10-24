#!/usr/bin/env bash
# Runs the backend locally against the local database (localhost:5500) while taking secrets and
# storage settings from backend/.env. The datasource URL in .env targets Docker, so it is not loaded.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -f .env ]]; then
    # A read loop (not `source <(...)`, which is a no-op in macOS bash 3.2) and no eval, so values keep any characters.
    while IFS= read -r line; do
        export "$line"
    done < <(grep -E '^(APP_STORAGE_[A-Z_]+|APP_JWT_SECRET|SPRING_DATASOURCE_USERNAME|SPRING_DATASOURCE_PASSWORD)=' .env)
fi
# Browser uploads go straight to storage, so the bucket must allow the frontend origin (see .env).
export APP_STORAGE_CORS_ORIGIN="${LOCAL_CORS_ORIGIN:-http://localhost:3101}"
# DevTools restarts break when another build rewrites target/classes mid-run; restart manually instead.
exec ./mvnw -q -Dmaven.test.skip=true spring-boot:run -Dspring-boot.run.jvmArguments="-Dspring.devtools.restart.enabled=false"
