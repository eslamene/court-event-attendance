#!/usr/bin/env bash
# Run after creating a Neon/Railway Postgres database.
# Usage: ./scripts/setup-vercel-env.sh
set -euo pipefail

cd "$(dirname "$0")/../web"

echo "Add these in Vercel (vercel env add) or paste when prompted:"
echo ""
read -rp "DATABASE_URL (postgresql://...): " DATABASE_URL
read -rp "NEXT_PUBLIC_APP_URL (https://xxx.vercel.app): " APP_URL
read -rsp "AUTH_SECRET (min 32 chars): " AUTH_SECRET; echo
read -rsp "STAFF_JWT_SECRET (min 32 chars): " STAFF_JWT; echo
read -rp "RESEND_API_KEY (optional): " RESEND_KEY
read -rp "EMAIL_FROM (optional): " EMAIL_FROM

vercel env add DATABASE_URL production <<< "$DATABASE_URL"
vercel env add NEXT_PUBLIC_APP_URL production <<< "$APP_URL"
vercel env add AUTH_SECRET production <<< "$AUTH_SECRET"
vercel env add STAFF_JWT_SECRET production <<< "$STAFF_JWT"

if [ -n "$RESEND_KEY" ]; then
  vercel env add RESEND_API_KEY production <<< "$RESEND_KEY"
fi
if [ -n "$EMAIL_FROM" ]; then
  vercel env add EMAIL_FROM production <<< "$EMAIL_FROM"
fi

echo ""
echo "Deploying and running migrations..."
vercel --prod --yes

DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy
DATABASE_URL="$DATABASE_URL" npx prisma db seed

echo "Done. Update mobile/eas.json EXPO_PUBLIC_API_URL to: $APP_URL"
