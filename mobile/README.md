# BARQ mobile (Expo)

Arabic-first React Native app for BARQ, connected to the Supabase backend in `../supabase`.

- Expo SDK 57 · React Native 0.86 · Expo Router · strict TypeScript · React Query · supabase-js
- Runs in **Expo Go** (no custom native modules)
- Roles: buyer, supplier and admin, each with its own tabs; access is enforced by the database, not the app

## Before the first sign-in (one time, Supabase dashboard)
Edit the **Magic Link** and **Confirm signup** email templates to include `{{ .Token }}`. Copy the text from `docs/LAUNCH_READINESS.md` §5. Without this step users get a link instead of the 6-digit code.

## Run on your phone with Expo Go
Install **Expo Go** (it must support **SDK 57**), then on a computer with Node.js 22 and Git:

```bash
git clone https://github.com/AethronX/BARQ.git
cd BARQ
git checkout claude/sleepy-ritchie-wkjzq2
cd mobile
npm install
npx expo start
```

Scan the QR code: with the iPhone Camera, or from inside Expo Go on Android.

If Expo Go shows "could not connect to the server":
- The phone and the PC must be on the same Wi-Fi network (not a guest network; mobile data and VPN off).
- On Windows, run once in an **administrator** PowerShell:
  `Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private` and
  `New-NetFirewallRule -DisplayName "Expo Metro 8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow`
- Check: open `http://<PC-IP>:8081` in the phone's browser. If it loads, the connection works.
- Last resort: `npm run start:tunnel` (ngrok, can be slow or time out).

`npm run web` opens the same app in a desktop browser.

## Open on the phone without the laptop (EAS Update)
One-time setup on the PC (free Expo account):
```bash
npm install -g eas-cli
eas login
eas init          # creates the Expo project and writes its id into app.json
npm run publish   # uploads the current version
```
On the phone: sign in to Expo Go with the same account. The project appears there, or open the update from expo.dev → project → Updates → Preview. Expo Go loads the latest published version each time; no laptop or shared network needed.

To ship a new version later: `git pull`, `npm install`, `npm run publish`.

Note: the published bundle contains the public `.env` values, including the demo test accounts. Treat the update link as internal.

## Trying the full flow
1. Sign in with email A and choose **Buyer**.
2. On a second phone (or after signing out), sign in with email B and choose **Supplier**. Pick the same category.
3. Make an admin account (`supabase/README.md`), sign in with it, and verify both companies in **Companies**.
4. Buyer: create an RFQ. Supplier: it appears in the inbox; submit a quote. Buyer: compare, then accept.
5. Supplier: move the order through processing → shipped → delivered. Buyer: confirm receipt.

## Configuration
`.env` holds only **public** values (Supabase URL and publishable key). Data access is limited by RLS, so this key is safe in the app. Never add a service-role key or any secret here. See `.env.example`.

## Commands
```bash
npm run typecheck   # TypeScript, strict
npm test            # domain unit tests (money, state machines, BARQ Score, validation)
npx expo start -c   # start with a cleared bundler cache
```

## Structure
```
src/
  app/        routes: sign-in, verify, onboarding, buyer/*, supplier/*, admin/*, order/[id]
  api/        supabase client (keychain session), typed queries/mutations, error mapping
  auth/       session + profile provider
  domain/     framework-free rules: money (integer baisa), state machines, BARQ Score, validation (+ tests)
  screens/    shared screens (alerts, orders, settings, role guard, tab bar)
  i18n/       all strings (ar/en)
  ui/         design tokens and components
```
