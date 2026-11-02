# HiJordan

A small, Instagram-DM-style messaging app built with Next.js, Postgres, and Auth.js.

- Email + password sign-in (works out of the box)
- Google sign-in when OAuth credentials are configured
- First-run onboarding: pick a unique username and a nickname
- One-to-one conversations with unread counts, sent/seen receipts, online status, and 4-second polling
- Settings for updating your username / nickname, plus sign out
- Generated emoji avatars, no photo uploads, no role-based inboxes

## Stack

- Next.js 16 (App Router, Server Actions)
- TypeScript + Tailwind CSS v4
- Auth.js v5 (`next-auth@beta`) with JWT sessions
- PostgreSQL via `pg` (designed for Neon, works with any Postgres)

## Getting started

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string, e.g. a Neon URL with `?sslmode=require` |
| `AUTH_SECRET` | Yes | Generate with `openssl rand -base64 32` |
| `AUTH_URL` | No | `http://localhost:3000` locally. On Vercel, leave it unset or use your `https://*.vercel.app` production URL — never `localhost` |
| `AUTH_TRUST_HOST` | Yes | `true` |
| `GOOGLE_CLIENT_ID` | No | Google sign-in is hidden unless both Google values are set |
| `GOOGLE_CLIENT_SECRET` | No | Same as above |

Create the schema:

```bash
npm run db:setup
```

Run the app:

```bash
npm run dev
```

Open http://localhost:3000, create an account with an email and password, then choose your username and nickname.

## Database

`db/schema.sql` is idempotent and is applied by `npm run db:setup`. It creates:

- `app_users` — email, optional Google subject / password hash, username, nickname
- `conversations` — one row per 1:1 conversation with a unique `direct_key`
- `conversation_members` — membership and last-read timestamps
- `messages` — message bodies (1–4000 characters)

The script also adds `password_hash` to databases created before email/password sign-in existed.

## Google sign-in (optional)

1. Create an OAuth client in the [Google Cloud console](https://console.cloud.google.com/apis/credentials).
2. Add an authorized redirect URI:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
3. Put the client ID and secret in `.env.local` and restart the app.

The Google button only appears when both values are present. Leave them empty to ship with email/password only.

## Deploying to Vercel

Add these environment variables in the Vercel project settings:

- `DATABASE_URL` — same Neon connection string
- `AUTH_SECRET` — a fresh `openssl rand -base64 32` value
- `AUTH_TRUST_HOST` — `true`
- `AUTH_URL` — **do not set it to localhost**. Either omit it (recommended; the deployed request host is used) or set it to your production URL, e.g. `https://hi-jordan.vercel.app`. For preview deployments, leave it unset so each preview uses its own URL.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional

If you use Google sign-in, add the production redirect URI in Google Cloud:
`https://your-production-domain/api/auth/callback/google`.

Keep `.env.local` out of version control.

## Notes

- Passwords are hashed with Node's `scrypt` (salted, constant-time comparison).
- Sessions are JWTs; the database user id is stored in the token and refreshed on each request.
- Conversations are strictly 1:1, enforced by a sorted `direct_key` unique constraint.
- Messages refresh by polling every 4 seconds, so no extra realtime service is needed.
