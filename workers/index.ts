import { createServer, type Server } from "node:http";
import { handleAsNodeRequest } from "cloudflare:node";
import type { Env } from "./env";

const API_PORT = 8080;

let httpServer: Server | undefined;
let serverReady = false;

function applyEnv(env: Env): void {
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.SESSION_SECRET =
    env.SESSION_SECRET ?? "dev-secret-change-in-production";
  process.env.CF_WORKER = "1";
}

async function ensureServer(env: Env): Promise<void> {
  applyEnv(env);
  if (serverReady) return;
  const { default: app } = await import("../artifacts/api-server/src/app");
  httpServer = createServer(app);
  httpServer.listen(API_PORT);
  serverReady = true;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith("/api")) {
      await ensureServer(env);
      return handleAsNodeRequest(API_PORT, request);
    }

    return env.ASSETS.fetch(request);
  },
};
