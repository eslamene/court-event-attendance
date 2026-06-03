#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/web"

echo "==> Railway deploy (web/)"
command -v railway >/dev/null || { echo "Install: npm i -g @railway/cli"; exit 1; }

railway up "$@"

echo ""
echo "Add PostgreSQL plugin and env vars in Railway dashboard."
echo "Seed once: railway run npm run db:seed"
