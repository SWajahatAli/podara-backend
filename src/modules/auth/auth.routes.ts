import type { FastifyInstance } from 'fastify'
import { AuthService } from './auth.service.js'
import { AuthController } from './auth.controller.js'
import { authenticate } from '../../shared/middleware/authenticate.js'

// ─────────────────────────────────────────────────────────────
// Podara — Auth Routes
// Prefix: /api/v1/auth
// ─────────────────────────────────────────────────────────────

export async function authRoutes(fastify: FastifyInstance) {
  const service = new AuthService(fastify)
  const controller = new AuthController(service)

  // ── Public Routes (no auth required) ──────────────────────

  // POST /api/v1/auth/register
  fastify.post('/register', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    handler: controller.register,
  })

  // POST /api/v1/auth/login
  fastify.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    handler: controller.login,
  })

  // POST /api/v1/auth/refresh
  fastify.post('/refresh', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    handler: controller.refresh,
  })

  // ── Protected Routes (auth required) ──────────────────────

  // POST /api/v1/auth/logout
  fastify.post('/logout', {
    preHandler: [authenticate],
    handler: controller.logout,
  })

  // POST /api/v1/auth/logout-all
  fastify.post('/logout-all', {
    preHandler: [authenticate],
    handler: controller.logoutAll,
  })

  // GET /api/v1/auth/me
  fastify.get('/me', {
    preHandler: [authenticate],
    handler: controller.me,
  })
}
