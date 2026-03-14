import path from "path";
import fs from "fs";
import type { PinoLoggerOptions } from "fastify/types/logger.js";

// ─────────────────────────────────────────────────────────────
// Podara — Logger Configuration
//
// Dev:  pretty-print to console + dev.log file
// Prod: structured JSON → error.log (warn+) + combined.log (info+)
//
// Log Levels (lowest → highest):
//   trace → debug → info → warn → error → fatal
// ─────────────────────────────────────────────────────────────

export const logsDir = path.join(process.cwd(), "logs");

// Ensure logs directory exists before Fastify boots
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ── Serializers ───────────────────────────────────────────────
// Controls how specific objects are serialized in every log line.
// Fastify passes req/res through these before writing the log.

export const logSerializers = {
  // Serialize only what matters from the request — never log auth headers or body
  req(request: {
    method: string;
    url: string;
    hostname: string;
    remoteAddress: string;
    remotePort: number;
    headers: Record<string, string | string[] | undefined>;
  }) {
    return {
      method: request.method,
      url: request.url,
      hostname: request.hostname,
      remoteAddress: request.remoteAddress,
      remotePort: request.remotePort,
      userAgent: request.headers["user-agent"] ?? "unknown",
      // Never log: Authorization, Cookie, body — sensitive data
    };
  },

  // Serialize only status code from response — timing comes from hook
  res(reply: { statusCode: number }) {
    return {
      statusCode: reply.statusCode,
    };
  },

  // Serialize errors with full stack in dev, minimal in prod
  err(error: Error & { statusCode?: number; code?: string }) {
    return {
      type: error.constructor.name,
      message: error.message,
      code: error.code ?? "UNKNOWN",
      statusCode: error.statusCode,
      stack: error.stack,
    };
  },
};

// ── Development Logger ─────────────────────────────────────────
// Pretty printed, colorized, all levels, dual output:
// → terminal (pino-pretty)
// → logs/dev.log (raw for searching)

export const devLogger: PinoLoggerOptions = {
  level: "debug",
  serializers: logSerializers,
  transport: {
    targets: [
      {
        target: "pino-pretty",
        level: "debug",
        options: {
          colorize: true,
          translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l", // includes milliseconds
          ignore: "pid,hostname",
          messageFormat: "{msg}",
          errorLikeObjectKeys: ["err", "error"],
          errorProps: "type,message,code,statusCode,stack",
          singleLine: false,
        },
      },
      {
        target: "pino/file",
        level: "debug",
        options: {
          destination: path.join(logsDir, "dev.log"),
          mkdir: true,
        },
      },
    ],
  },
};

// ── Production Logger ──────────────────────────────────────────
// Structured JSON, split by severity:
// → logs/error.log    — warn and above (alerts, errors, fatals)
// → logs/combined.log — info and above (all traffic + errors)
//
// JSON format is compatible with Datadog, Logtail, Grafana Loki

export const prodLogger: PinoLoggerOptions = {
  level: "info",
  serializers: logSerializers,
  transport: {
    targets: [
      {
        target: "pino/file",
        level: "warn",
        options: {
          destination: path.join(logsDir, "error.log"),
          mkdir: true,
          sync: false, // async write — no I/O blocking
        },
      },
      {
        target: "pino/file",
        level: "info",
        options: {
          destination: path.join(logsDir, "combined.log"),
          mkdir: true,
          sync: false,
        },
      },
    ],
  },
};
