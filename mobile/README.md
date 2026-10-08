# BARQ mobile (Expo)

Arabic-first React Native app for the BARQ buyer flow, running on **mock data** (no backend yet).

- Expo SDK 57 · React Native 0.86 · Expo Router · strict TypeScript
- Runs in **Expo Go** (no custom native modules)
- Arabic (RTL) by default, English from the **More** tab; language switches live

## Run it on your phone with Expo Go

1. Install **Expo Go** from the App Store / Google Play. It must support **SDK 57**, so update it if it is older.
2. On your computer (Node.js 20.19+ or 22+, Git):

```bash
git clone https://github.com/AethronX/BARQ.git
cd BARQ
git checkout claude/sleepy-ritchie-wkjzq2
cd mobile
npm install
npx expo start
```

3. Scan the QR code: with the iPhone **Camera** app, or from inside **Expo Go** on Android.

If the phone and the computer are on different networks (or the office Wi-Fi blocks local traffic), use a tunnel instead:

```bash
npx expo start --tunnel
```

## Useful commands

```bash
npm run typecheck   # TypeScript, strict
npm test            # domain unit tests (money, state machines, BARQ Score, validation)
npx expo start -c   # start with a cleared bundler cache
```

## Structure

```
src/
  app/          Expo Router screens (tabs: home, rfqs, orders, alerts, more; rfq/new, rfq/[id], delivery, international, track)
  domain/       framework-free rules: money (integer baisa), state machines, BARQ Score, validation (+ tests)
  data/mock.ts  fictional companies and prices (IS_MOCK); replace with the API client later
  state/        in-memory store with idempotent create actions
  i18n/         all strings (ar/en) + provider
  ui/           design tokens and shared components
```

## What is real and what is not

- All companies, prices, ratings and shipments are **fictional**; every screen shows a demo banner.
- No server, login, payments or real carrier integration. Data resets when the app closes.
- Security rules (authorization, tenant isolation, file scanning) must live on the future backend; nothing in this app is a security boundary.
