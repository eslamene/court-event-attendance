# Deployment Guide

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (local PostgreSQL)
- [Vercel CLI](https://vercel.com/docs/cli) or [Railway CLI](https://docs.railway.com/develop/cli)
- [Resend](https://resend.com) API key + verified domain
- [Twilio](https://twilio.com) account (optional SMS)
- [Expo](https://expo.dev) account for mobile builds

---

## 1. Local PostgreSQL

```bash
# From project root
docker compose up -d

cd web
cp .env.example .env
npm install
npm run db:setup   # migrate + seed
npm run dev
```

---

## 2. Deploy web to Vercel

### A. Create Postgres (Neon — free tier)

1. Go to [neon.tech](https://neon.tech) → New project
2. Copy connection string: `postgresql://user:pass@host/db?sslmode=require`

### B. Deploy

```bash
cd web
npm i -g vercel
vercel login
vercel link
```

Set environment variables in Vercel dashboard (Settings → Environment Variables):

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Neon **pooler** URL (`…-pooler…`) — runtime queries |
| `DIRECT_URL` | Neon **direct** URL (no `-pooler`) — Prisma migrations |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `STAFF_JWT_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | `https://court-events.flagshipfintech.com` |
| `APP_PUBLIC_URL` | same as above (canonical links) |
| `EMAIL_FROM` | `Court Events <noreply@yourdomain.com>` — must match Twilio verified sender |
| `TWILIO_ACCOUNT_SID` | `AC…` from Twilio Console (not API key `SK…`) |
| `TWILIO_AUTH_TOKEN` | from Twilio Console |
| `RESEND_API_KEY` | optional fallback |
| `SENDGRID_API_KEY` | optional fallback |
| `TWILIO_PHONE_NUMBER` | optional SMS |
| `TWILIO_WHATSAPP_NUMBER` | optional WhatsApp |

```bash
vercel --prod
```

After first deploy, seed production (one time):

```bash
# Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in Vercel, then:
vercel env pull .env.production.local
npx prisma db seed
# Remove SEED_* vars from Vercel after seeding
```

`vercel.json` runs `prisma generate` at build time. Run migrations **once** after setting `DATABASE_URL` and `DIRECT_URL` (see `web/.env.example`). `prisma.config.ts` uses `DIRECT_URL` for the CLI:

```bash
cd web
npx prisma migrate deploy
npx prisma db seed
```

Or use `./scripts/setup-vercel-env.sh` for an interactive setup.

---

## 3. Deploy web to Railway

```bash
cd web
npm i -g @railway/cli
railway login
railway init
```

1. Add **PostgreSQL** plugin in Railway dashboard
2. Link `DATABASE_URL` from the Postgres service
3. Add other env vars (same table as Vercel)
4. Deploy:

```bash
railway up
```

`railway.toml` configures build + migrate + start.

Run seed once:

```bash
railway run npm run db:seed
```

---

## 4. Resend & Twilio setup

### Resend

1. Create API key at [resend.com/api-keys](https://resend.com/api-keys)
2. Verify your sending domain (DNS records)
3. Set `EMAIL_FROM="اسم <noreply@yourdomain.com>"`
4. Test from admin: **الإشعارات** → send test email

### Twilio (Egypt SMS)

1. Buy a Twilio number with SMS capability
2. For Egyptian mobiles, use E.164: `+201xxxxxxxxx`
3. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
4. Test from admin: **الإشعارات** → send test SMS

---

## 5. Mobile production builds (EAS)

**Expo project:** [@eslamene/court-event-attendance](https://expo.dev/accounts/eslamene/projects/court-event-attendance)  
**Full GitHub CI/CD guide:** [mobile/EXPO_GITHUB.md](./mobile/EXPO_GITHUB.md)

### One-time setup

```bash
cd mobile
npx eas-cli login          # account: eslamene
npx eas-cli project:info   # verify @eslamene/court-event-attendance
```

1. Connect repo in [Expo → GitHub](https://expo.dev/accounts/eslamene/projects/court-event-attendance/github) → `eslamene/court-event-attendance`
2. Create [Expo access token](https://expo.dev/accounts/eslamene/settings/access-tokens)
3. Add GitHub secret: `gh secret set EXPO_TOKEN --repo eslamene/court-event-attendance`

### CI/CD (automatic)

- **Every PR/push** touching `mobile/` → TypeScript check (`.github/workflows/mobile-ci.yml`)
- **Every push to `main`** touching `mobile/` → EAS **preview** Android APK (`.github/workflows/eas-build.yml`)

### Local / manual build

```bash
cd mobile
npm run build:preview
# Download APK from expo.dev build page
```

### Production store builds

```bash
# Android App Bundle (Google Play)
npm run build:prod:android

# iOS (App Store — requires Apple Developer account)
npm run build:prod:ios

# Submit (after configuring submit profiles in eas.json)
npm run submit:android
npm run submit:ios
```

### Credentials

- **Android**: EAS manages keystore on first build
- **iOS**: `eas credentials` — Apple Developer Team required
- Update `eas.json` `submit.production` with your Apple ID and ASC app ID

---

## 6. Post-deploy checklist

- [ ] `NEXT_PUBLIC_APP_URL` matches live URL
- [ ] Registration link works: `/register/golden-jubilee-2026`
- [ ] Admin login works, change default passwords
- [ ] Test email/SMS from `/admin/settings`
- [ ] Mobile app `EXPO_PUBLIC_API_URL` points to production
- [ ] HTTPS only (automatic on Vercel/Railway)

---

## Environment reference

See `web/.env.example` and `mobile/.env.example`.
