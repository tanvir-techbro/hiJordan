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
| `AUTH_URL` | No | `http://localhost:3000` locally. In production leave it unset (the request host is used) or set it to the exact public URL. Never `localhost` |
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

## Mobile app

A React Native (Expo) client lives in [`mobile/`](./mobile). It shares the same
database and accounts through the bearer-token `/api/mobile/*` routes.

```bash
cd mobile
npm install
npm start
```

See [`mobile/README.md`](./mobile/README.md) for `EXPO_PUBLIC_API_URL` and other
details.

## Database

`db/schema.sql` is idempotent and is applied by `npm run db:setup`. It creates:

- `app_users` — email, optional Google subject / password hash, username, nickname
- `conversations` — one row per 1:1 conversation with a unique `direct_key`
- `conversation_members` — membership and last-read timestamps
- `messages` — message bodies (1–4000 characters)
- `push_subscriptions` — browser push endpoints per user (web notifications)

The script also adds `password_hash` to databases created before email/password sign-in existed.

## Google sign-in (optional)

1. Create an OAuth client in the [Google Cloud console](https://console.cloud.google.com/apis/credentials).
2. Add an authorized redirect URI:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
3. Put the client ID and secret in `.env.local` and restart the app.

The Google button only appears when both values are present. Leave them empty to ship with email/password only.

## Web push notifications

People can turn on browser notifications from **Settings → Notifications**. A
notification is sent to the other person whenever a message arrives, even if the
tab is closed. While a HiJordan tab is visible and focused, the service worker
stays quiet because the app already updates itself.

Notifications need a VAPID key pair:

```bash
npm run push:keys
```

Put the output in `.env.local` (and in the host's environment variables):

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="https://your-domain.com"   # or mailto:you@example.com
```

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` is inlined at build time, so set it **before**
deploying and redeploy after changing it. Without the keys the app still works;
the toggle just explains that notifications aren't configured.

The service worker lives in `public/sw.js` and must stay at the site root.

## Message actions

Right-click a bubble (or long-press it on touch) to get WhatsApp-style actions:

- **Reply** — quotes the message above the composer and inside the new bubble
- **Copy** — copies the message text
- **Edit** — only on your own messages; saved edits show an “Edited” label
- **Delete** — only on your own messages; asks for confirmation first

Replies and edits are stored in Postgres (`messages.reply_to_id` and
`messages.edited_at`). The web and mobile APIs expose `PATCH`/`DELETE` at
`/api/conversations/[id]/messages/[messageId]` with sender-ownership checks.

## Appearance

**Settings → Appearance** offers Light, Light grey, Dark (black), Dark grey, and
System themes. Choices are stored in `localStorage` and applied before the first
paint by the script in `app/layout.tsx`, so there is no flash when the page
loads. The tokens live in `app/globals.css`.

## Deploying

The app runs on any host that builds Next.js with Node.js. Add these environment
variables in the host's dashboard:

- `DATABASE_URL` — same Postgres connection string
- `AUTH_SECRET` — a fresh `openssl rand -base64 32` value
- `AUTH_TRUST_HOST` — `true`
- `AUTH_URL` — **do not set it to localhost**. Either omit it (recommended; the
  deployed request host is used) or set it to your exact production URL.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` — web push
  (see [Web push notifications](#web-push-notifications))

If you use Google sign-in, add the production redirect URI in Google Cloud:
`https://your-production-domain/api/auth/callback/google`.

Keep `.env.local` out of version control.

### Netlify (works with delegated subdomains such as `hijordan.qd.je`)

DigitalPlat only delegates nameservers; it has no DNS record editor. Netlify
supports standalone subdomains, so it can host `hijordan.qd.je` directly.

1. Push the repo to GitHub.
2. In Netlify: **Add new site → Import an existing project → GitHub**, then
   pick the repository. Build command `npm run build` is detected automatically.
3. Add the environment variables listed above, then deploy.
4. Open **Domain management → Add custom domain**, enter
   `hijordan.qd.je`, then **Verify → Add subdomain**.
5. Open the domain's **Options → Set up Netlify DNS** and copy the nameservers
   Netlify shows (they look like `dns1.p0X.nsone.net`).
6. In the DigitalPlat dashboard, open the domain and replace its nameservers
   with the Netlify ones.
7. Wait for DNS propagation. Netlify then issues the HTTPS certificate
   automatically and the app is live at `https://hijordan.qd.je`.

### Vercel

Vercel treats `qd.je` as the apex domain because `qd.je` is not on the Public
Suffix List, so it asks for a TXT record at `_vercel.qd.je`. DigitalPlat cannot
create records in the parent `qd.je` zone, so a `*.qd.je` name cannot be
verified on Vercel. Vercel works with registrable domains (`example.com`) and
with namespaces that are on the Public Suffix List (`us.kg`, `qzz.io`, `xx.kg`,
`dpdns.org`).

## Notes

- Passwords are hashed with Node's `scrypt` (salted, constant-time comparison).
- Sessions are JWTs; the database user id is stored in the token and refreshed on each request.
- Conversations are strictly 1:1, enforced by a sorted `direct_key` unique constraint.
- Messages refresh by polling every 4 seconds, so no extra realtime service is needed.
