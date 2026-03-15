import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { AppError } from './app_error.js'
import { ValidationError } from './http_error.js';
import { ApiResponseBuilder } from '../response/api_response.js'
import { Prisma } from '../../../generated/prisma/index.js'

// ─────────────────────────────────────────────────────────────
// Podara — Global Error Handler
//
// Single entry point for ALL errors thrown anywhere in the app.
// Handles in priority order:
//
//   1. AppError subclasses    → our own typed errors
//   2. Prisma errors          → DB-level errors mapped to HTTP
//   3. Fastify errors         → framework validation, 404s etc.
//   4. JWT errors             → token malformed / expired
//   5. Zod errors             → schema validation (raw, not wrapped)
//   6. SyntaxError            → malformed JSON body
//   7. Unknown errors         → everything else → 500
//
// isOperational = false errors are logged at fatal level
// and should trigger alerts in production monitoring.
// ─────────────────────────────────────────────────────────────

const isProd = process.env.NODE_ENV === 'production'

export function globalErrorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const requestId = request.id

  // ── 1. AppError — our own typed errors ────────────────────
  // All intentional errors thrown from services/controllers

  if (error instanceof AppError) {
    // Non-operational = programmer bug — log at fatal for alerting
    if (!error.isOperational) {
      request.log.fatal(
        {
          requestId,
          err: {
            type: error.name,
            message: error.message,
            errorCode: error.errorCode,
            stack: error.stack,
          },
        },
        '💀 Non-operational error — potential bug',
      )
    } else {
      request.log.warn(
        {
          requestId,
          err: {
            type: error.name,
            message: error.message,
            errorCode: error.errorCode,
            statusCode: error.statusCode,
          },
        },
        `⚠ Operational error [${error.statusCode}]`,
      )
    }

    // ValidationError carries issues array
    if (error instanceof ValidationError) {
      void reply
        .code(400)
        .send(
          ApiResponseBuilder.error(error.message, 400, error.errorCode, requestId, error.issues),
        )
      return
    }

    void reply
      .code(error.statusCode)
      .send(ApiResponseBuilder.error(error.message, error.statusCode, error.errorCode, requestId))
    return
  }

  // ── 2. Prisma Errors — map DB errors to HTTP ──────────────

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    request.log.error(
      {
        requestId,
        prismaCode: error.code,
        meta: error.meta,
        message: error.message,
      },
      'Prisma known request error',
    )

    // P2002 — Unique constraint violation
    if (error.code === 'P2002') {
      const fields = (error.meta?.target as string[])?.join(', ') ?? 'field'
      void reply
        .code(409)
        .send(
          ApiResponseBuilder.error(
            `A record with this ${fields} already exists.`,
            409,
            'CONFLICT',
            requestId,
          ),
        )
      return
    }

    // P2025 — Record not found (update/delete on non-existent record)
    if (error.code === 'P2025') {
      void reply
        .code(404)
        .send(ApiResponseBuilder.error('Record not found.', 404, 'NOT_FOUND', requestId))
      return
    }

    // P2003 — Foreign key constraint violation
    if (error.code === 'P2003') {
      void reply
        .code(409)
        .send(
          ApiResponseBuilder.error(
            'Related resource does not exist.',
            409,
            'FOREIGN_KEY_VIOLATION',
            requestId,
          ),
        )
      return
    }

    // P2014 — Required relation violation
    if (error.code === 'P2014') {
      void reply
        .code(400)
        .send(
          ApiResponseBuilder.error(
            'Invalid relation in request.',
            400,
            'INVALID_RELATION',
            requestId,
          ),
        )
      return
    }

    // All other known Prisma errors → 500
    void reply
      .code(500)
      .send(
        ApiResponseBuilder.error(
          isProd ? 'A database error occurred.' : error.message,
          500,
          'DATABASE_ERROR',
          requestId,
        ),
      )
    return
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    request.log.error({ requestId, err: error }, 'Prisma unknown request error')
    void reply
      .code(500)
      .send(
        ApiResponseBuilder.error(
          isProd ? 'A database error occurred.' : error.message,
          500,
          'DATABASE_ERROR',
          requestId,
        ),
      )
    return
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    request.log.fatal({ requestId, err: error }, '💀 Prisma failed to connect to database')
    void reply
      .code(503)
      .send(
        ApiResponseBuilder.error(
          'Database connection unavailable. Please try again later.',
          503,
          'SERVICE_UNAVAILABLE',
          requestId,
        ),
      )
    return
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    request.log.fatal({ requestId, err: error }, '💀 Prisma engine panic')
    void reply
      .code(503)
      .send(
        ApiResponseBuilder.error(
          'A critical database error occurred.',
          503,
          'SERVICE_UNAVAILABLE',
          requestId,
        ),
      )
    return
  }

  // ── 3. Fastify Errors ─────────────────────────────────────
  // Framework-level: route not found, method not allowed,
  // body too large, schema validation failure

  const fastifyError = error as FastifyError

  if (fastifyError.statusCode !== undefined) {
    // FST_ERR_VALIDATION — Fastify AJV schema validation
    if (fastifyError.code === 'FST_ERR_VALIDATION') {
      request.log.warn({ requestId, err: fastifyError }, 'Fastify schema validation error')
      void reply
        .code(400)
        .send(
          ApiResponseBuilder.error(
            'Request validation failed.',
            400,
            'VALIDATION_ERROR',
            requestId,
          ),
        )
      return
    }

    // 413 — Payload too large
    if (fastifyError.statusCode === 413) {
      void reply
        .code(413)
        .send(
          ApiResponseBuilder.error(
            'Request payload too large.',
            413,
            'PAYLOAD_TOO_LARGE',
            requestId,
          ),
        )
      return
    }

    // 415 — Unsupported media type
    if (fastifyError.statusCode === 415) {
      void reply
        .code(415)
        .send(
          ApiResponseBuilder.error(
            'Unsupported media type.',
            415,
            'UNSUPPORTED_MEDIA_TYPE',
            requestId,
          ),
        )
      return
    }

    // All other Fastify errors — use their statusCode
    request.log.warn({ requestId, err: fastifyError }, `Fastify error [${fastifyError.statusCode}]`)
    void reply
      .code(fastifyError.statusCode)
      .send(
        ApiResponseBuilder.error(
          isProd ? 'Request could not be processed.' : fastifyError.message,
          fastifyError.statusCode,
          fastifyError.code ?? 'FASTIFY_ERROR',
          requestId,
        ),
      )
    return
  }

  // ── 4. JWT Errors ─────────────────────────────────────────
  // @fastify/jwt throws these for invalid/expired tokens

  if (error.name === 'JsonWebTokenError') {
    void reply
      .code(401)
      .send(ApiResponseBuilder.error('Invalid token.', 401, 'INVALID_TOKEN', requestId))
    return
  }

  if (error.name === 'TokenExpiredError') {
    void reply
      .code(401)
      .send(ApiResponseBuilder.error('Token has expired.', 401, 'TOKEN_EXPIRED', requestId))
    return
  }

  if (error.name === 'NotBeforeError') {
    void reply
      .code(401)
      .send(ApiResponseBuilder.error('Token not yet valid.', 401, 'TOKEN_NOT_ACTIVE', requestId))
    return
  }

  // ── 5. SyntaxError — malformed JSON body ──────────────────

  if (error instanceof SyntaxError && 'body' in error) {
    void reply
      .code(400)
      .send(
        ApiResponseBuilder.error('Malformed JSON in request body.', 400, 'INVALID_JSON', requestId),
      )
    return
  }

  // ── 6. Unknown / Unhandled Errors ─────────────────────────
  // Anything that reaches here is an unhandled programmer error.
  // Log at fatal — this should trigger an alert in production.

  request.log.fatal(
    {
      requestId,
      err: {
        type: error.constructor.name,
        message: error.message,
        stack: error.stack,
      },
    },
    '💀 Unhandled error — this is a bug',
  )

  void reply
    .code(500)
    .send(
      ApiResponseBuilder.error(
        isProd ? 'An unexpected error occurred.' : error.message,
        500,
        'INTERNAL_SERVER_ERROR',
        requestId,
      ),
    )
}
