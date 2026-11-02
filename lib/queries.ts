import { pool } from "@/lib/db";
import type {
  ChatMessage,
  ConversationSummary,
  PublicUser,
  SessionUser,
} from "@/lib/types";

export interface DbUser {
  id: string;
  google_sub: string | null;
  email: string;
  google_name: string | null;
  password_hash: string | null;
  username: string | null;
  nickname: string | null;
  last_seen_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface ConversationRow {
  id: string;
  updated_at: Date;
  peer_id: string;
  peer_username: string;
  peer_nickname: string;
  last_id: string | null;
  last_body: string | null;
  last_sender_id: string | null;
  last_created_at: Date | null;
  unread_count: number;
  peer_last_read_at: Date | null;
  peer_last_seen_at: Date | null;
  peer_online: boolean;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: Date;
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: iso(row.created_at),
  };
}

export function toPublicUser(
  row: Pick<DbUser, "id" | "username" | "nickname">,
): PublicUser | null {
  if (!row.username || !row.nickname) return null;
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
  };
}

export function toSessionUser(row: DbUser): SessionUser | null {
  const publicUser = toPublicUser(row);
  if (!publicUser) return null;
  return { ...publicUser, email: row.email };
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const { rows } = await pool.query<DbUser>(
    `SELECT * FROM app_users WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const { rows } = await pool.query<DbUser>(
    `SELECT * FROM app_users WHERE email = $1`,
    [email.trim().toLowerCase()],
  );
  return rows[0] ?? null;
}

export async function createCredentialUser(
  email: string,
  passwordHash: string,
): Promise<DbUser> {
  const { rows } = await pool.query<DbUser>(
    `INSERT INTO app_users (email, password_hash)
     VALUES ($1, $2)
     RETURNING *`,
    [email.trim().toLowerCase(), passwordHash],
  );
  if (!rows[0]) throw new Error("Could not create the account.");
  return rows[0];
}

export async function upsertGoogleUser(input: {
  googleSub: string;
  email: string;
  name: string | null;
}): Promise<DbUser> {
  const email = input.email.trim().toLowerCase();

  try {
    const { rows } = await pool.query<DbUser>(
      `INSERT INTO app_users (google_sub, email, google_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (google_sub) DO UPDATE
         SET email = EXCLUDED.email,
             google_name = COALESCE(EXCLUDED.google_name, app_users.google_name),
             updated_at = now()
       RETURNING *`,
      [input.googleSub, email, input.name],
    );
    if (rows[0]) return rows[0];
  } catch (error) {
    // The Google account's email may already exist under a different sub.
    // Google has verified the address, so attach the new sub to that account.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      const { rows } = await pool.query<DbUser>(
        `UPDATE app_users
         SET google_sub = $1,
             google_name = COALESCE($3, google_name),
             updated_at = now()
         WHERE email = $2
         RETURNING *`,
        [input.googleSub, email, input.name],
      );
      if (rows[0]) return rows[0];
    }
    throw error;
  }

  throw new Error("Could not create the user account.");
}

export async function completeOnboarding(
  userId: string,
  username: string,
  nickname: string,
): Promise<DbUser | null> {
  const { rows } = await pool.query<DbUser>(
    `UPDATE app_users
     SET username = $2, nickname = $3, updated_at = now()
     WHERE id = $1 AND username IS NULL
     RETURNING *`,
    [userId, username, nickname],
  );
  return rows[0] ?? null;
}

export async function updateProfile(
  userId: string,
  username: string,
  nickname: string,
): Promise<DbUser | null> {
  const { rows } = await pool.query<DbUser>(
    `UPDATE app_users
     SET username = $2, nickname = $3, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [userId, username, nickname],
  );
  return rows[0] ?? null;
}

export async function listConversations(
  userId: string,
): Promise<ConversationSummary[]> {
  const { rows } = await pool.query<ConversationRow>(
    `SELECT
       c.id,
       c.updated_at,
       peer.id AS peer_id,
       peer.username AS peer_username,
       peer.nickname AS peer_nickname,
       lm.id AS last_id,
       lm.body AS last_body,
       lm.sender_id AS last_sender_id,
       lm.created_at AS last_created_at,
       COALESCE(unread.count, 0)::int AS unread_count,
       CASE
         WHEN them.last_read_at > 'epoch' THEN them.last_read_at
         ELSE NULL
       END AS peer_last_read_at,
       peer.last_seen_at AS peer_last_seen_at,
       (
         peer.last_seen_at IS NOT NULL
         AND peer.last_seen_at > now() - interval '75 seconds'
       ) AS peer_online
     FROM conversation_members AS me
     JOIN conversations AS c ON c.id = me.conversation_id
     JOIN conversation_members AS them
       ON them.conversation_id = c.id AND them.user_id <> me.user_id
     JOIN app_users AS peer ON peer.id = them.user_id
     LEFT JOIN LATERAL (
       SELECT m.id, m.body, m.sender_id, m.created_at
       FROM messages AS m
       WHERE m.conversation_id = c.id
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT 1
     ) AS lm ON true
     LEFT JOIN LATERAL (
       SELECT count(*)::int AS count
       FROM messages AS m
       WHERE m.conversation_id = c.id
         AND m.sender_id <> me.user_id
         AND m.created_at > me.last_read_at
     ) AS unread ON true
     WHERE me.user_id = $1
       AND peer.username IS NOT NULL
     ORDER BY COALESCE(lm.created_at, c.created_at) DESC`,
    [userId],
  );

  return rows.map((row) => {
    const peer: PublicUser = {
      id: row.peer_id,
      username: row.peer_username,
      nickname: row.peer_nickname,
    };
    const lastMessage: ChatMessage | null =
      row.last_id && row.last_body && row.last_sender_id && row.last_created_at
        ? {
            id: row.last_id,
            conversationId: row.id,
            senderId: row.last_sender_id,
            body: row.last_body,
            createdAt: iso(row.last_created_at),
          }
        : null;
    return {
      id: row.id,
      peer,
      lastMessage,
      unreadCount: row.unread_count,
      updatedAt: iso(row.updated_at),
      peerLastReadAt: row.peer_last_read_at ? iso(row.peer_last_read_at) : null,
      peerLastSeenAt: row.peer_last_seen_at ? iso(row.peer_last_seen_at) : null,
      peerOnline: row.peer_online,
    };
  });
}

export async function getConversationPeer(
  userId: string,
  conversationId: string,
): Promise<PublicUser | null> {
  const { rows } = await pool.query<{
    id: string;
    username: string;
    nickname: string;
  }>(
    `SELECT peer.id, peer.username, peer.nickname
     FROM conversation_members AS me
     JOIN conversation_members AS them
       ON them.conversation_id = me.conversation_id AND them.user_id <> me.user_id
     JOIN app_users AS peer ON peer.id = them.user_id
     WHERE me.user_id = $1 AND me.conversation_id = $2
     LIMIT 1`,
    [userId, conversationId],
  );
  return rows[0] ?? null;
}

export async function getMessages(
  userId: string,
  conversationId: string,
  limit = 200,
): Promise<ChatMessage[]> {
  const { rows } = await pool.query<MessageRow>(
    `SELECT * FROM (
       SELECT m.id, m.conversation_id, m.sender_id, m.body, m.created_at
       FROM messages AS m
       WHERE m.conversation_id = $2
         AND EXISTS (
           SELECT 1 FROM conversation_members AS cm
           WHERE cm.conversation_id = m.conversation_id AND cm.user_id = $1
         )
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT $3
     ) AS recent
     ORDER BY recent.created_at ASC, recent.id ASC`,
    [userId, conversationId, limit],
  );
  return rows.map(mapMessage);
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  body: string,
): Promise<ChatMessage | null> {
  const { rows } = await pool.query<MessageRow>(
    `INSERT INTO messages (conversation_id, sender_id, body)
     SELECT $2, $1, $3
     WHERE EXISTS (
       SELECT 1 FROM conversation_members
       WHERE conversation_id = $2 AND user_id = $1
     )
     RETURNING *`,
    [userId, conversationId, body],
  );
  if (!rows[0]) return null;

  await pool.query(`UPDATE conversations SET updated_at = now() WHERE id = $1`, [
    conversationId,
  ]);
  return mapMessage(rows[0]);
}

export async function markConversationRead(
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE conversation_members
     SET last_read_at = now()
     WHERE conversation_id = $2 AND user_id = $1`,
    [userId, conversationId],
  );
  return (result.rowCount ?? 0) > 0;
}

// Throttled heartbeat so polling doesn't write on every request.
export async function touchPresence(userId: string): Promise<void> {
  await pool.query(
    `UPDATE app_users
     SET last_seen_at = now()
     WHERE id = $1
       AND (
         last_seen_at IS NULL
         OR last_seen_at < now() - interval '15 seconds'
       )`,
    [userId],
  );
}

export async function createOrGetConversation(
  userId: string,
  peerId: string,
): Promise<string | null> {
  if (userId === peerId) return null;

  const { rows: peerRows } = await pool.query<{ id: string }>(
    `SELECT id FROM app_users WHERE id = $1 AND username IS NOT NULL`,
    [peerId],
  );
  if (!peerRows[0]) return null;

  const directKey = [userId, peerId].sort().join(":");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO conversations (direct_key)
       VALUES ($1)
       ON CONFLICT (direct_key) DO UPDATE SET direct_key = EXCLUDED.direct_key
       RETURNING id`,
      [directKey],
    );
    const conversationId = rows[0]?.id;
    if (!conversationId) throw new Error("Could not create conversation.");

    await client.query(
      `INSERT INTO conversation_members (conversation_id, user_id)
       VALUES ($1, $2), ($1, $3)
       ON CONFLICT DO NOTHING`,
      [conversationId, userId, peerId],
    );

    await client.query("COMMIT");
    return conversationId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function searchUsers(
  userId: string,
  query: string,
): Promise<PublicUser[]> {
  const trimmed = query.trim();
  const escaped = trimmed.replace(/[\\%_]/g, "\\$&");
  const pattern = `%${escaped}%`;

  const { rows } = await pool.query<PublicUser>(
    `SELECT id, username, nickname
     FROM app_users
     WHERE id <> $1
       AND username IS NOT NULL
       AND (
         $2 = ''
         OR username ILIKE $3
         OR nickname ILIKE $3
       )
     ORDER BY
       CASE WHEN lower(username) = lower($2) THEN 0 ELSE 1 END,
       updated_at DESC
     LIMIT 12`,
    [userId, trimmed.replace(/^@+/, ""), pattern],
  );
  return rows;
}
