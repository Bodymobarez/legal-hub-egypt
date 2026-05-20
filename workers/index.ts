import { createServer, type Server } from "node:http";
import { httpServerHandler } from "cloudflare:node:http";
import type { Env } from "./env";

let httpHandler: ReturnType<typeof httpServerHandler> | undefined;
let httpServer: Server | undefined;

function applyEnv(env: Env): void {
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.SESSION_SECRET =
    env.SESSION_SECRET ?? "dev-secret-change-in-production";
}

async function getApiHandler(env: Env) {
  applyEnv(env);
  if (!httpHandler) {
    const { default: app } = await import("../artifacts/api-server/src/app");
    httpServer = createServer(app);
    httpHandler = httpServerHandler(httpServer);
  }
  return httpHandler;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith("/api")) {
      const handler = await getApiHandler(env);
      return handler(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};
