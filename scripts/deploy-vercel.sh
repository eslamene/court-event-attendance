#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/web"

echo "==> Vercel production deploy (web/)"
command -v vercel >/dev/null || { echo "Install: npm i -g vercel"; exit 1; }

vercel --prod "$@"

echo ""
echo "Done. Set env vars in Vercel dashboard if not already configured."
echo "Then run: cd web && vercel env pull && npm run db:seed"
