import express, {
  type Express,
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const sessionSecret = process.env.SESSION_SECRET ?? "dev-secret-change-in-production";

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(sessionSecret));

app.use("/api", router);

/**
 * Catch-all error middleware. Without this, async route handlers that
 * reject leave us with a 500 status code in the access log but no
 * actual exception — making intermittent failures (db reconnects, etc.)
 * impossible to diagnose. We log the full error and respond with a
 * structured JSON body so the client can show something useful.
 */
const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const e = err as { message?: string; stack?: string; status?: number; code?: string };
  const status = typeof e?.status === "number" ? e.status : 500;
  logger.error(
    {
      err: {
        message: e?.message ?? String(err),
        stack:   e?.stack,
        code:    e?.code,
      },
      url: req.originalUrl,
      method: req.method,
    },
    "Unhandled route error",
  );
  if (res.headersSent) return;
  res.status(status).json({
    error: e?.message || "Internal Server Error",
    code:  e?.code,
  });
};
app.use(errorHandler);

export default app;
