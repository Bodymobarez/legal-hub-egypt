import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isWorker = !!process.env.CF_WORKER;

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  /* Workers cannot spawn pino-pretty transport threads. */
  ...(isWorker || isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
