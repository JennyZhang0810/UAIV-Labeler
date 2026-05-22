#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/make_nginx_config.sh <domain>"
  echo "Example: scripts/make_nginx_config.sh annotation.example.com"
  exit 2
fi

DOMAIN="$1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/deploy/nginx_${DOMAIN}.conf"

sed "s/YOUR_DOMAIN_HERE/${DOMAIN}/g" "$ROOT/deploy/nginx_annotation.conf" > "$OUT"

echo "Generated: $OUT"
echo
echo "Ask a root/admin user to install it with:"
echo "  sudo cp '$OUT' /etc/nginx/conf.d/uaiv-labeler.conf"
echo "  sudo nginx -t"
echo "  sudo systemctl reload nginx"
