#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export URBAN_ANNOTATION_HOST="${URBAN_ANNOTATION_HOST:-127.0.0.1}"
export URBAN_ANNOTATION_PORT="${URBAN_ANNOTATION_PORT:-7860}"
export UAIV_BROWSE_ROOTS="${UAIV_BROWSE_ROOTS:-${ROOT}/sample_data}"
export UAIV_DEFAULT_BROWSE_PATH="${UAIV_DEFAULT_BROWSE_PATH:-${ROOT}/sample_data}"
export UAIV_QA_ROOT="${UAIV_QA_ROOT:-${ROOT}/sample_data/qa}"
export UAIV_OFFLINE_DEMO=1

echo "Starting UAIV-Labeler Offline Demo"
echo "Root: ${ROOT}"
echo "Browse roots: ${UAIV_BROWSE_ROOTS}"
echo "Open: http://${URBAN_ANNOTATION_HOST}:${URBAN_ANNOTATION_PORT}"

exec python app/server.py

