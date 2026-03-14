import 'dotenv/config'
import Fastify, { type FastifyError, type FastifyLoggerOptions } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { authRoutes } from './modules/auth/auth.routes.js'
import fs from 'fs'
import path from 'path'

// ─────────────────────────────────────────────────────────────
// Podara — App Entry Point
// ─────────────────────────────────────────────────────────────

const isProd = process.env.NODE_ENV === 'production'

// Ensure logs directory exists for file logging
const logsDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })

// ── Logger Configuration ──────────────────────────────────────
// Development: pretty print to console
// Production:  structured JSON to file + console

const devLogger: FastifyLoggerOptions = {
  level: 'debug',
  // transport: {
  //   targets: [
  //     // Pretty print to console in dev
  //     {
  //       target: "pino-pretty",
  //       level: "debug",
  //       options: {
  //         colorize: true,
  //         translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
  //         ignore: "pid,hostname",
  //       },
  //     },
  //     // Also write to file in dev
  //     {
  //       target: "pino/file",
  //       level: "debug",
  //       options: {
  //         destination: path.join(logsDir, "dev.log"),
  //         mkdir: true,
  //       },
  //     },
  //   ],
  // },
}

const prodLogger: FastifyLoggerOptions = {
  level: 'warn',
  // transport: {
  //   targets: [
  //     // Structured JSON logs for Railway log aggregation
  //     {
  //       target: "pino/file",
  //       level: "warn",
  //       options: {
  //         destination: path.join(logsDir, "error.log"),
  //         mkdir: true,
  //       },
  //     },
  //     // Info level separate file for access logs
  //     {
  //       target: "pino/file",
  //       level: "info",
  //       options: {
  //         destination: path.join(logsDir, "combined.log"),
  //         mkdir: true,
  //       },
  //     },
  //   ],
  // },
}

// ── Fastify Instance ──────────────────────────────────────────

const fastify = Fastify({
  logger: isProd ? prodLogger : devLogger,
  trustProxy: true, // Required for Railway — gets real IP behind proxy
})

// ── Bootstrap ─────────────────────────────────────────────────

const start = async () => {
  try {
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
      reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Route ${request.method} ${request.url} not found.`,
      })
    })

    // ── Global Error Handler ───────────────────────────────────

    fastify.setErrorHandler((error: FastifyError, request, reply) => {
      fastify.log.error({
        err: error,
        url: request.url,
        method: request.method,
      })

      reply.code(error.statusCode ?? 500).send({
        statusCode: error.statusCode ?? 500,
        error: 'Internal Server Error',
        message: isProd ? 'Something went wrong.' : error.message,
      })
    })

    // ── Start Server ───────────────────────────────────────────

    const port = Number(process.env.PORT) || 3000
    await fastify.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 Podara backend running on port ${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
