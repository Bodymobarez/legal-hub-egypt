/** Cloudflare Worker bindings (see wrangler.toml + `wrangler secret put`). */
export interface Env {
  ASSETS: Fetcher;
  DATABASE_URL: string;
  SESSION_SECRET: string;
}
