import { readFileSync } from "node:fs";
import { setDefaultAutoSelectFamily } from "node:net";
import { setDefaultResultOrder } from "node:dns";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

// Some hosts resolve pooler endpoints to unreachable IPv6 addresses. Prefer
// IPv4 and skip Node's Happy Eyeballs fallback, which can hang on those.
setDefaultAutoSelectFamily(false);
setDefaultResultOrder("ipv4first");

const here = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(here, "..", "db", "schema.sql"), "utf8");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

try {
  await pool.query(schema);
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('app_users', 'conversations', 'conversation_members', 'messages')
     ORDER BY table_name`,
  );
  console.log("Schema ready:", rows.map((row) => row.table_name).join(", "));
} catch (error) {
  console.error("Failed to set up schema:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
