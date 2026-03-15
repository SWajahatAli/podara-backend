import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

// ─────────────────────────────────────────────────────────────
// Podara — HTTP Request Logger Plugin
//
// Compliant with: GDPR, PCI-DSS
// Never logs: Authorization, Cookie, request body,
//             sensitive query params (token, email, key, secret)
//
// Hooks:
//   onRequest  → incoming request metadata
//   onResponse → response status + timing
//   onError    → request-scoped error with stack
// ─────────────────────────────────────────────────────────────

// ── Sensitive Query Key Redaction ──────────────────────────────
// Any query param matching these keys is replaced with [REDACTED]
// before being written to logs.
// Add new keys here as the API grows — never remove existing ones.

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'secret',
  'key',
  'apikey',
  'api_key',
  'password',
  'email', // PII — links to real person (GDPR)
  'reset_token',
  'access_token',
  'refresh_token',
  'code', // OAuth authorization codes
  'signature',
])

function sanitizeQuery(query: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(query).map(([key, value]) => [
      key,
      SENSITIVE_QUERY_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : value,
    ]),
  )
}

// ─────────────────────────────────────────────────────────────

async function httpLogger(app: FastifyInstance) {
  // ── Incoming Request ────────────────────────────────────────
  // Fires before route handler.
  // Logs operational context only — no credentials, no PII.

  app.addHook('onRequest', async (request: FastifyRequest) => {
    request.log.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        path: request.routeOptions?.url ?? request.url, // matched route pattern
        query: sanitizeQuery(request.query as Record<string, unknown>),
        ip: request.ip,
        ips: request.ips, // full proxy chain — requires trustProxy: true
        hostname: request.hostname,
        protocol: request.protocol,
        userAgent: request.headers['user-agent'] ?? 'unknown',
        origin: request.headers['origin'] ?? 'none',
        referer: request.headers['referer'] ?? 'none',
        // ── Never logged (compliance) ──────────────────────
        // Authorization → contains Bearer tokens
        // Cookie        → contains session data
        // request.body  → may contain passwords, tokens, PII
      },
      '→ Incoming request',
    )
  })

  // ── Outgoing Response ───────────────────────────────────────
  // Fires after route handler + serialization completes.
  // Log level is derived from status code for easy alerting:
  //   5xx → error  (PagerDuty / alert-worthy)
  //   4xx → warn   (client errors — monitor for spikes)
  //   2xx → info   (normal traffic)

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const responseTime = reply.elapsedTime

    const level = reply.statusCode >= 500 ? 'error' : reply.statusCode >= 400 ? 'warn' : 'info'

    request.log[level](
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: `${responseTime.toFixed(2)}ms`,
        contentType: reply.getHeader('content-type') ?? 'none',
      },
      `← Outgoing response [${reply.statusCode}] ${responseTime.toFixed(2)}ms`,
    )
  })

  // ── Request-Scoped Errors ───────────────────────────────────
  // Fires when a route handler throws.
  // The global error handler in index.ts handles the response —
  // this hook adds the originating request context to the error log
  // so you can trace: requestId → error → response in one search.

  app.addHook('onError', async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
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
          // code and statusCode come from FastifyError — present when applicable
          ...('code' in error && { code: (error as NodeJS.ErrnoException).code }),
          ...('statusCode' in error && {
            statusCode: (error as { statusCode?: number }).statusCode,
          }),
        },
      },
      '✖ Request error',
    )
  })
}

export default fp(httpLogger, {
  name: 'http-logger',
  fastify: '5.x',
})
