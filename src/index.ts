import 'dotenv/config'
import Fastify, { type FastifyError } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { authRoutes } from './modules/auth/auth.routes.js'
import fs from 'fs'
import path from 'path'
import type { PinoLoggerOptions } from 'fastify/types/logger.js'
import httpLogger from './plugins/request.logger.js'
import { devLogger, prodLogger } from './shared/config/logger.js'
import { ApiResponseBuilder } from './shared/response/index.js'
import { globalErrorHandler } from './shared/errors/error_handler.js'
import { registerSwagger } from './shared/config/swagger.js'

// ─────────────────────────────────────────────────────────────
// Podara — App Entry Point
// ─────────────────────────────────────────────────────────────

const isProd = process.env.NODE_ENV === 'production'

// ── Fastify Instance ──────────────────────────────────────────

const fastify = Fastify({
  logger: isProd ? prodLogger : devLogger,
  trustProxy: true, // Required for Railway — gets real IP behind proxy
  ajv: {
    customOptions: {
      strict: 'log', // warn instead of throw on unknown keywords
      keywords: ['example'], // explicitly allow 'example' annotation
    },
  },
})

// ── Fastify Logger ──────────────────────────────────────────

await fastify.register(httpLogger)

// ── Bootstrap ─────────────────────────────────────────────────

const start = async () => {
  try {
    // ── Swagger — must register BEFORE routes ──────────────────
    if (!isProd) {
      await registerSwagger(fastify)
    }

    // ── Plugins ────────────────────────────────────────────────

    await fastify.register(cors, {
      origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    })

    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      errorResponseBuilder: () => ({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'You are sending too many requests. Please slow down.',
      }),
    })

    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET!,
    })

    // ── Routes ─────────────────────────────────────────────────

    await fastify.register(authRoutes, { prefix: '/api/v1/auth' })

    // ── Health Check ───────────────────────────────────────────

    // eslint-disable-next-line @typescript-eslint/require-await
    fastify.get('/health', async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
    }))

    // ── 404 Handler ────────────────────────────────────────────

    fastify.setNotFoundHandler((request, reply) => {
      request.log.warn({ method: request.method, url: request.url }, 'Route not found')

      void reply
        .code(404)
        .send(
          ApiResponseBuilder.error(
            `Route ${request.method} ${request.url} not found.`,
            404,
            'ROUTE_NOT_FOUND',
            request.id,
          ),
        )
    })

    // ── Global Error Handler ───────────────────────────────────

    fastify.setErrorHandler((error: FastifyError, request, reply) => {
      request.log.error({
        err: error,
        url: request.url,
        method: request.method,
      })

      reply
        .code(error.statusCode ?? 500)
        .send(
          ApiResponseBuilder.error(
            isProd ? 'Something went wrong.' : error.message,
            500,
            'INTERNAL_SERVER_ERROR',
          ),
        )
    })

    // ── Global Error Handler ───────────────────────────────────
    fastify.setErrorHandler(globalErrorHandler)

    // ── Start ──────────────────────────────────────────────────
    const port = Number(process.env.PORT) || 3000
    await fastify.listen({ port, host: '0.0.0.0' })

    fastify.log.info(
      { port, environment: process.env.NODE_ENV ?? 'development' },
      `🚀 Podara backend running`,
    )

    if (!isProd) {
      fastify.log.info(`📖 Swagger docs → http://localhost:${port}/docs`)
    }
  } catch (err) {
    fastify.log.fatal({ err }, 'Failed to start server')
    process.exit(1)
  }
}

// ── Graceful Shutdown ──────────────────────────────────────────
// Ensures in-flight requests complete before process exits

const shutdown = async (signal: string) => {
  fastify.log.info({ signal }, 'Shutdown signal received')
  await fastify.close()
  fastify.log.info('Server closed — goodbye')
  process.exit(0)
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})
process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

start()
