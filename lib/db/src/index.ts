import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

type DbInstance =
  | ReturnType<typeof drizzlePg<typeof schema>>
  | ReturnType<typeof drizzleNeon<typeof schema>>;

let pool: pg.Pool | undefined;
let dbInstance: DbInstance | undefined;

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  return url;
}

/** Cloudflare Workers: HTTP driver (no TCP pool). Local/Node: pg Pool. */
export function ensureDb(): DbInstance {
  if (!dbInstance) {
    if (process.env.CF_WORKER) {
      const sql = neon(requireDatabaseUrl());
      dbInstance = drizzleNeon(sql, { schema });
    } else {
      pool = new Pool({ connectionString: requireDatabaseUrl() });
      dbInstance = drizzlePg(pool, { schema });
    }
  }
  return dbInstance;
}

export function getPool(): pg.Pool {
  if (process.env.CF_WORKER) {
    throw new Error("getPool() is not available on Cloudflare Workers (use neon-http).");
  }
  ensureDb();
  return pool!;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    dbInstance = undefined;
  }
}

export const db = new Proxy({} as DbInstance, {
  get(_target, prop, receiver) {
    return Reflect.get(ensureDb() as object, prop, receiver);
  },
});

export { schema };
export * from "./schema";
