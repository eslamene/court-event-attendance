# Expo + GitHub CI/CD

Mobile app: [@eslamene/court-event-attendance](https://expo.dev/accounts/eslamene/projects/court-event-attendance)  
GitHub: [eslamene/court-event-attendance](https://github.com/eslamene/court-event-attendance)

## 1. Log in to Expo (local)

```bash
cd mobile
npx eas-cli login
npx eas-cli whoami
# Expected: eslamene
```

## 2. Link GitHub in Expo dashboard

1. Open [Project → GitHub](https://expo.dev/accounts/eslamene/projects/court-event-attendance/github)
2. Click **Connect GitHub** (authorize Expo if prompted)
3. Select repository **`eslamene/court-event-attendance`**
4. Confirm — builds from GitHub Actions will appear on the project dashboard

## 3. Add `EXPO_TOKEN` to GitHub (required for CI)

1. Create a token: [expo.dev/accounts/eslamene/settings/access-tokens](https://expo.dev/accounts/eslamene/settings/access-tokens) → **Create token** (name: `github-actions`)
2. Copy the token (shown once)
3. Add to GitHub:

```bash
gh secret set EXPO_TOKEN --repo eslamene/court-event-attendance
# paste token when prompted
```

Or: GitHub → **Settings → Secrets and variables → Actions → New repository secret** → name `EXPO_TOKEN`.

## 4. What runs on each commit

| Workflow | When | What |
|----------|------|------|
| **Mobile CI** (`.github/workflows/mobile-ci.yml`) | Push/PR touching `mobile/` | `npm ci` + TypeScript check |
| **EAS Build** (`.github/workflows/eas-build.yml`) | Push to `main` touching `mobile/` | EAS **preview** APK build (Android) |

Manual production/preview builds:

```bash
gh workflow run eas-build.yml -f profile=production -f platform=android
```

Or from Expo: [Start build](https://expo.dev/accounts/eslamene/projects/court-event-attendance/builds) → **Build from GitHub**.

## 5. EAS profiles (`eas.json`)

| Profile | Use |
|---------|-----|
| `preview` | **Standalone release** — internal APK / Ad Hoc iOS, production API (use this for staff devices) |
| `production` | **App Store / TestFlight** — store distribution, production API |
| `development` | Dev client + Metro only (Android); **do not use for iOS staff installs** |

### iOS staff installs (not dev mode)

Do **not** use `expo start` or `build:dev` on iPhones. Install a release build:

```bash
npm run build:preview:ios    # Ad Hoc — install from expo.dev link
npm run build:release:ios    # TestFlight / App Store
```

## 6. Verify setup

```bash
cd mobile
npx eas-cli project:info
# fullName: @eslamene/court-event-attendance

# After pushing workflows + EXPO_TOKEN:
gh run list --workflow=eas-build.yml
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| Must have access to **hennawy** account | `app.config.ts` `owner` must be `eslamene` |
| EAS project not configured | `extra.eas.projectId` must be set in `app.config.ts` |
| Missing EXPO_TOKEN | Complete step 3 above |
| iOS build fails in CI | Run `eas credentials` locally first; Apple Developer account required |
