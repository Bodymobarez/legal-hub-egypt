import { createServer, type Server } from "node:http";
import { httpServerHandler } from "cloudflare:node";
import type { Env } from "./env";

const API_PORT = 8080;

type FetchHandler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
) => Promise<Response>;

let apiHandler: FetchHandler | undefined;
let httpServer: Server | undefined;

function applyEnv(env: Env): void {
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.SESSION_SECRET =
    env.SESSION_SECRET ?? "dev-secret-change-in-production";
}

async function getApiHandler(env: Env): Promise<FetchHandler> {
  applyEnv(env);
  if (!apiHandler) {
    const { default: app } = await import("../artifacts/api-server/src/app");
    httpServer = createServer(app);
    httpServer.listen(API_PORT);
    apiHandler = httpServerHandler({ port: API_PORT }) as FetchHandler;
  }
  return apiHandler;
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
