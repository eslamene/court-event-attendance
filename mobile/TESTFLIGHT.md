# TestFlight setup

| Item | Value |
|------|--------|
| Expo project | [@eslamene/court-event-attendance](https://expo.dev/accounts/eslamene/projects/court-event-attendance) |
| Bundle ID | `com.courtcassation.eventattendance` |
| App Store Connect app ID | `6777443492` |
| Apple Team | `N785NB3ZPP` (FLAGSHIP FOR FINANCIAL TECHNOLOGY) |
| Apple ID | `eslam.ene@gmail.com` |

## Status

- **Production store builds** — configured (`eas.json` → `production` profile, `distribution: store`)
- **Submit config** — `ascAppId` set in `eas.json`
- **Missing for automated submit** — App Store Connect API key on EAS (one-time setup below)

---

## Step 1 — App Store Connect (one-time)

1. Open [App Store Connect](https://appstoreconnect.apple.com) → **Apps**
2. Confirm app **مسح حضور الفعاليات** exists with bundle ID `com.courtcassation.eventattendance`
3. Complete **App Information** (name, category, privacy policy URL if required)
4. Under **App Privacy**, declare camera usage (QR scanning)

---

## Step 2 — App Store Connect API key (one-time, required for submit)

1. [App Store Connect → Users and Access → Integrations → App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api)
2. **Team Keys** → **+** → name `EAS Submit` → role **App Manager** (or Admin)
3. Download the `.p8` file (once only)
4. Note **Issuer ID** and **Key ID**

### Option A — Store on EAS (recommended)

```bash
cd mobile
npx eas-cli credentials
# → iOS → App Store Connect: Manage your API Key → Set up API Key
# Upload the .p8 or let EAS generate one
```

### Option B — Local key file

1. Save the key as `mobile/asc-api-key.p8` (already gitignored)
2. Uncomment / fill in `ascApiKeyId` and `ascApiKeyIssuerId` in `eas.json` → `submit.production.ios`

---

## Step 3 — Build for TestFlight

```bash
cd mobile
npm run build:release:ios
```

After the build finishes, submit (Step 4).

Track builds: [expo.dev builds](https://expo.dev/accounts/eslamene/projects/court-event-attendance/builds)

---

## Step 4 — Submit to TestFlight

After a **production** build finishes:

```bash
npm run submit:ios:latest
```

Or submit a specific build:

```bash
eas submit --platform ios --profile production --id <BUILD_ID>
```

Wait **15–60 minutes** for Apple processing. Check [App Store Connect → TestFlight](https://appstoreconnect.apple.com).

---

## Step 5 — Add testers

### Internal (fast, up to 100 team members)

1. App Store Connect → your app → **TestFlight** → **Internal Testing**
2. Create a group → add builds → add team members

### External (beta review first time)

1. **External Testing** → create group → add testers by email
2. First build needs **Beta App Review** (usually quick)

Testers install the **TestFlight** app from the App Store, then accept your invite.

---

## Ad Hoc vs TestFlight

| | Ad Hoc (`preview`) | TestFlight (`production`) |
|--|-------------------|---------------------------|
| Command | `npm run build:preview:ios` | `npm run build:release:ios` + submit |
| Install | expo.dev link | TestFlight app |
| Device limit | Registered UDIDs only | Unlimited testers |

---

## GitHub Actions (optional)

Add these repository secrets for automated TestFlight submit:

| Secret | Value |
|--------|--------|
| `EXPO_TOKEN` | Expo access token |
| `ASC_API_KEY` | Base64-encoded `.p8` file contents |
| `ASC_API_KEY_ID` | Key ID |
| `ASC_API_KEY_ISSUER_ID` | Issuer ID |

Then run workflow **EAS TestFlight** manually from GitHub Actions.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| App not on TestFlight | Build must be `production` + `store`, then `eas submit` |
| `API Keys cannot be set up in --non-interactive mode` | Complete Step 2 (API key on EAS) |
| Processing stuck | Normal for first build; check email for Apple compliance questions |
| `ITSAppUsesNonExemptEncryption` | Already `false` in `app.config.ts` |
| Wrong Apple team | `appleTeamId` must be `N785NB3ZPP` in `eas.json` |
