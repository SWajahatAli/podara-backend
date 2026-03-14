import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

// ─────────────────────────────────────────────────────────────
// Podara — HTTP Request Logger Plugin
//
// Logs every request lifecycle event with full context:
//   onRequest  → incoming request metadata
//   onResponse → outgoing response with timing
//   onError    → request-scoped error context
//
// Registered as a Fastify plugin via fastify-plugin so hooks
// are scoped to the root instance and apply to all routes.
// ─────────────────────────────────────────────────────────────

async function httpLogger(app: FastifyInstance) {
  // ── Incoming Request ────────────────────────────────────────
  // Fires before route handler — logs full request context

  app.addHook("onRequest", async (request: FastifyRequest) => {
    request.log.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        path: request.routeOptions?.url ?? request.url,
        query: request.query,
        ip: request.ip,
        ips: request.ips, // proxy chain IPs (trustProxy: true)
        hostname: request.hostname,
        userAgent: request.headers["user-agent"] ?? "unknown",
        origin: request.headers["origin"] ?? "none",
        referer: request.headers["referer"] ?? "none",
        protocol: request.protocol,
        // Never log: Authorization header, Cookie, request body — sensitive
      },
      "→ Incoming request",
    );
  });

  // ── Outgoing Response ───────────────────────────────────────
  // Fires after route handler completes — logs response with timing

  app.addHook(
    "onResponse",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const responseTime = reply.elapsedTime;

      // Log level based on status code:
      // 5xx → error, 4xx → warn, 2xx/3xx → info
      const level =
        reply.statusCode >= 500
          ? "error"
          : reply.statusCode >= 400
            ? "warn"
            : "info";

      request.log[level](
        {
          requestId: request.id,
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          responseTime: `${responseTime.toFixed(2)}ms`,
          contentType: reply.getHeader("content-type") ?? "none",
        },
        `← Outgoing response [${reply.statusCode}] ${responseTime.toFixed(2)}ms`,
      );
    },
  );

  // ── Request-Scoped Errors ───────────────────────────────────
  // Fires when an error is thrown inside a route handler.
  // Global error handler in index.ts still runs — this adds request context.

  app.addHook(
    "onError",
    async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
      request.log.error(
        {
          requestId: request.id,
          method: request.method,
          url: request.url,
          ip: request.ip,
          err: {
            type: error.constructor.name,
            message: error.message,
            stack: error.stack,
          },
        },
        "✖ Request error",
      );
    },
  );

  // ── Route Not Found ─────────────────────────────────────────
  // Fires when no route matched — 404s worth tracking separately

  app.addHook("onRequest", async (request: FastifyRequest) => {
    // 404s are caught by setNotFoundHandler in index.ts
    // This hook is intentionally kept minimal — avoid double logging
    void request; // suppress unused warning
  });
}

export default fp(httpLogger, {
  name: "http-logger",
  fastify: "5.x",
});
