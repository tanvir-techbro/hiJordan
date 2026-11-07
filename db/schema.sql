-- HiJordan database schema
-- Run with: npm run db:setup

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub text UNIQUE,
  email text NOT NULL UNIQUE,
  google_name text,
  password_hash text,
  username text UNIQUE,
  nickname text,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_users_username_format
    CHECK (username IS NULL OR username ~ '^[a-z0-9._]{3,20}$'),
  CONSTRAINT app_users_nickname_length
    CHECK (nickname IS NULL OR char_length(nickname) BETWEEN 1 AND 30)
);

-- For databases created before email/password sign-in was added.
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash text;

-- For online presence.
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direct_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT 'epoch',
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  body text NOT NULL,
  reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_body_length
    CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000)
);

-- For databases created before replies and editing were added.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id uuid
  REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;

CREATE INDEX IF NOT EXISTS conversation_members_user_idx
  ON conversation_members (user_id);

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_sender_idx
  ON messages (sender_id);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON push_subscriptions (user_id);
