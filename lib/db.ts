import { setDefaultResultOrder } from "node:dns";
import { setDefaultAutoSelectFamily } from "node:net";
import { Pool } from "pg";

// Pooler hosts can resolve to unreachable IPv6 addresses. Prefer IPv4 and skip
// Node's Happy Eyeballs fallback, which can hang on those addresses.
setDefaultAutoSelectFamily(false);
setDefaultResultOrder("ipv4first");

const globalForDb = globalThis as unknown as { hiJordanPool?: Pool };

export const pool =
  globalForDb.hiJordanPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 20_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.hiJordanPool = pool;
}
