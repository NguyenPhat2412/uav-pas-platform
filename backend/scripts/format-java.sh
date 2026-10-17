#!/bin/sh
set -eu

if [ "$#" -gt 1 ]; then
    echo "Usage: $0 [check|apply]" >&2
    exit 2
fi
format_action=${1:-check}
case "$format_action" in
    check|apply) ;;
    *) echo "Usage: $0 [check|apply]" >&2; exit 2 ;;
esac
backend_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
format_build_dir=${UAV_FORMAT_BUILD_DIR:-"$backend_dir/../docs/work/java-format-cache"}
cd "$backend_dir"
exec ./mvnw --batch-mode -f "$backend_dir/pom.xml" \
    "-Duav.build.directory=$format_build_dir" "spotless:$format_action"
