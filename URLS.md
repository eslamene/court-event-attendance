# Court Event Attendance — All URLs

Quick reference for every link in the project.

**Production base URL:** `https://court-events.flagshipfintech.com`  
**Local base URL:** `http://localhost:3000` (run `npm run dev` in `web/`)

> **Business guide (Arabic):** [BUSINESS_GUIDE.md](./BUSINESS_GUIDE.md) — roles, credentials, workflows.

---

## Infrastructure

| Service | URL |
|---------|-----|
| **Production site** | https://court-events.flagshipfintech.com |
| GitHub repository | https://github.com/eslamene/court-event-attendance |
| Vercel dashboard | https://vercel.com/flagships-projects/court-event-attendance |
| Neon database | [Neon Console](https://console.neon.tech) |
| Expo / EAS | https://expo.dev/accounts/eslamene/projects/court-event-attendance |
| Expo ↔ GitHub | https://expo.dev/accounts/eslamene/projects/court-event-attendance/github |
| EAS CI setup | [mobile/EXPO_GITHUB.md](./mobile/EXPO_GITHUB.md) |

---

## Public web (judges)

| Page | Production | Local |
|------|------------|-------|
| Home | https://court-events.flagshipfintech.com/ | http://localhost:3000/ |
| Registration (demo event) | https://court-events.flagshipfintech.com/register/golden-jubilee-2026 | http://localhost:3000/register/golden-jubilee-2026 |
| Registration (any event) | `https://court-events.flagshipfintech.com/register/{slug}` | `http://localhost:3000/register/{slug}` |

---

## Admin dashboard

| Page | Production | Local |
|------|------------|-------|
| Login | https://court-events.flagshipfintech.com/admin/login | http://localhost:3000/admin/login |
| Registrations | https://court-events.flagshipfintech.com/admin | http://localhost:3000/admin |
| Events | https://court-events.flagshipfintech.com/admin/events | http://localhost:3000/admin/events |
| Users | https://court-events.flagshipfintech.com/admin/users | http://localhost:3000/admin/users |
| Notifications | https://court-events.flagshipfintech.com/admin/settings | http://localhost:3000/admin/settings |

### Demo accounts

| Role | Email | Password | Web admin |
|------|-------|----------|-----------|
| System admin | `admin@court.local` | `Admin@123` | Yes |
| Approval manager | `manager@court.local` | `Admin@123` | Yes |
| Event staff | `staff@court.local` | `Admin@123` | Mobile app only |

---

## API endpoints

Base: `https://court-events.flagshipfintech.com` or `http://localhost:3000`

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/events/{slug}` | Event details |
| POST | `/api/register/{slug}` | Submit registration |
| GET | `/api/qr/{token}` | QR metadata |
| GET | `/api/qr/{token}/image` | QR PNG (WhatsApp) |

### Admin (session — login via `/admin/login`)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/admin/*` | Events, registrations, users, export, notifications |

### Mobile (Bearer JWT)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/mobile/login` | Staff login |
| GET | `/api/mobile/session` | Refresh staff session + active events |
| POST | `/api/mobile/scan` | Scan QR (returns `seatLabel`, `result` codes) |

---

## Mobile app

| Item | Value |
|------|-------|
| API base (production) | `https://court-events.flagshipfintech.com` |
| Staff login | `staff@court.local` / `Admin@123` |

---

## QR image (WhatsApp / email)

`https://court-events.flagshipfintech.com/api/qr/{qrToken}/image`

---

## Related docs

- [BUSINESS_GUIDE.md](./BUSINESS_GUIDE.md) — business users & credentials  
- [README.md](./README.md) — technical overview  
- [DEPLOYMENT.md](./DEPLOYMENT.md) — hosting  
- [docs/TWILIO_INTEGRATION.md](./docs/TWILIO_INTEGRATION.md) — email + WhatsApp
