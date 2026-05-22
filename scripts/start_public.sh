#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

HOST="${URBAN_ANNOTATION_HOST:-0.0.0.0}"
PORT="${URBAN_ANNOTATION_PORT:-7860}"
export UAIV_BROWSE_ROOTS="${UAIV_BROWSE_ROOTS:-${ROOT}/sample_data:/datasets}"
export UAIV_DEFAULT_BROWSE_PATH="${UAIV_DEFAULT_BROWSE_PATH:-${ROOT}/sample_data}"
export UAIV_QA_ROOT="${UAIV_QA_ROOT:-${ROOT}/sample_data/qa}"

echo "Starting UAIV-Labeler on ${HOST}:${PORT}"
echo "Project root: ${ROOT}"
echo "Browse roots: ${UAIV_BROWSE_ROOTS}"
echo "If this is a public server, open http://<server-ip>:${PORT}"

exec python app/server.py
