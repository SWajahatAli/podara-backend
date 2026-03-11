import "dotenv/config";
import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { registerSwagger } from "./shared/config/swagger.js";
import fs from "fs";
import path from "path";
import type { PinoLoggerOptions } from "fastify/types/logger.js";

// ─────────────────────────────────────────────────────────────
// Podara — App Entry Point
// ─────────────────────────────────────────────────────────────

const isProd = process.env.NODE_ENV === "production";

// Ensure logs directory exists for file logging
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

// ── Logger Configuration ──────────────────────────────────────
// Development: pretty print to console
// Production:  structured JSON to file + console

const devLogger: PinoLoggerOptions = {
  level: "debug",
  transport: {
    targets: [
      {
        target: "pino-pretty",
        level: "debug",
        options: {
          colorize: true,
          translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
      {
        target: "pino/file",
        level: "debug",
        options: { destination: path.join(logsDir, "dev.log"), mkdir: true },
      },
    ],
  },
};

const prodLogger: PinoLoggerOptions = {
  level: "warn",
  transport: {
    targets: [
      {
        target: "pino/file",
        level: "warn",
        options: { destination: path.join(logsDir, "error.log"), mkdir: true },
      },
      {
        target: "pino/file",
        level: "info",
        options: {
          destination: path.join(logsDir, "combined.log"),
          mkdir: true,
        },
      },
    ],
  },
};

// ── Fastify Instance ──────────────────────────────────────────

const fastify = Fastify({
  logger: isProd ? prodLogger : devLogger,
  trustProxy: true, // Required for Railway — gets real IP behind proxy
  ajv: {
    customOptions: {
      strict: "log", // warn instead of throw on unknown keywords
      keywords: ["example"], // explicitly allow 'example' annotation
    },
  },
});

// ── Bootstrap ─────────────────────────────────────────────────

const start = async () => {
  try {
    // ── Swagger — must register BEFORE routes ──────────────────
    if (!isProd) {
      await registerSwagger(fastify);
    }

    // ── Plugins ────────────────────────────────────────────────

    await fastify.register(cors, {
      origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    });

    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: "1 minute",
      errorResponseBuilder: () => ({
        statusCode: 429,
        error: "Too Many Requests",
        message: "You are sending too many requests. Please slow down.",
      }),
    });

    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET!,
    });

    // ── Routes ─────────────────────────────────────────────────

    await fastify.register(authRoutes, { prefix: "/api/v1/auth" });

    // ── Health Check ───────────────────────────────────────────

    fastify.get("/health", async () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? "development",
    }));

    // ── 404 Handler ────────────────────────────────────────────

    fastify.setNotFoundHandler((request, reply) => {
      reply.code(404).send({
        statusCode: 404,
        error: "Not Found",
        message: `Route ${request.method} ${request.url} not found.`,
      });
    });

    // ── Global Error Handler ───────────────────────────────────

    fastify.setErrorHandler((error: FastifyError, request, reply) => {
      fastify.log.error({
        err: error,
        url: request.url,
        method: request.method,
      });

      reply.code(error.statusCode ?? 500).send({
        statusCode: error.statusCode ?? 500,
        error: "Internal Server Error",
        message: isProd ? "Something went wrong." : error.message,
      });
    });

    // ── Start Server ───────────────────────────────────────────

    const port = Number(process.env.PORT) || 3000;
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 Podara backend running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
