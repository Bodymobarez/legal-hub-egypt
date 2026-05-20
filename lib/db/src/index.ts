import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | undefined;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  return url;
}

/** Lazily connect so Cloudflare Workers can inject env before first query. */
export function ensureDb() {
  if (!dbInstance) {
    pool = new Pool({ connectionString: requireDatabaseUrl() });
    dbInstance = drizzle(pool, { schema });
  }
  return dbInstance;
}

export function getPool(): pg.Pool {
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

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    return Reflect.get(ensureDb() as object, prop, receiver);
  },
});

export { schema };
export * from "./schema";
