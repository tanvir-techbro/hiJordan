# HiJordan Mobile

The React Native (Expo) client for HiJordan. It talks to the existing Next.js
backend over HTTPS using the `/api/mobile/*` endpoints, so the mobile app and
the website share the same database, accounts, and conversations.

## Features

- Email + password sign-in and sign-up
- First-run onboarding: pick a username and nickname
- Inbox with unread badges, online dots, pull-to-refresh, and 4-second polling
- Chat with day dividers, bubbles, **Sent** / **Seen**, online status, and an
  emoji picker
- New message search
- Settings: edit your profile, see your sign-in method, sign out
- Generated emoji avatars (no photo uploads)

## Requirements

- Node.js 20+
- The [Expo Go](https://expo.dev/go) app on your phone, or an Android/iOS
  simulator
- A running HiJordan web backend

## Run it

```bash
cd mobile
npm install
npm start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

The app defaults to the deployed backend at
`https://hi-jordan-phi.vercel.app`. To point it at another server:

```bash
cp .env.example .env
# edit EXPO_PUBLIC_API_URL
npm start -- --clear
```

`EXPO_PUBLIC_API_URL` must be reachable from the device. `localhost` works in a
simulator, but on a physical phone use your computer's LAN address instead:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000
```

## API

The mobile app uses dedicated bearer-token endpoints added to the Next.js app:

| Method | Route |
| --- | --- |
| `POST` | `/api/mobile/auth/register` |
| `POST` | `/api/mobile/auth/login` |
| `GET` / `PATCH` | `/api/mobile/me` |
| `GET` | `/api/mobile/users?q=` |
| `GET` / `POST` | `/api/mobile/conversations` |
| `GET` / `POST` | `/api/mobile/conversations/:id/messages` |
| `POST` | `/api/mobile/conversations/:id/read` |

Tokens are HS256 JWTs signed with `AUTH_SECRET` and valid for 30 days. They are
stored with `expo-secure-store` on the device.

Google sign-in is web-only for now. The mobile app uses email and password, so
accounts created with Google need a password before they can sign in here.

## Checks

```bash
npm run typecheck
npx expo export --platform android
```
