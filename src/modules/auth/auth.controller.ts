import type { FastifyRequest, FastifyReply } from 'fastify'
import { type AuthService } from './auth.service.js'
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.schema.js'

// ─────────────────────────────────────────────────────────────
// Podara — Auth Controller
// Handles HTTP layer only — parsing, validation, response
// All business logic delegated to AuthService
// ─────────────────────────────────────────────────────────────

export class AuthController {
  private service: AuthService

  constructor(service: AuthService) {
    this.service = service
  }

  // ── POST /auth/register ────────────────────────────────────

  register = async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = registerSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parsed.error.issues[0]?.message ?? 'Invalid input',
        issues: parsed.error.issues,
      })
    }

    try {
      const result = await this.service.register(parsed.data)
      return reply.code(201).send({
        statusCode: 201,
        message: 'Account created successfully.',
        data: result,
      })
    } catch (err: any) {
      return reply.code(err.statusCode ?? 500).send({
        statusCode: err.statusCode ?? 500,
        error: err.statusCode === 409 ? 'Conflict' : 'Internal Server Error',
        message: err.message ?? 'Something went wrong.',
      })
    }
  }

  // ── POST /auth/login ───────────────────────────────────────

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parsed.error.issues[0]?.message ?? 'Invalid input',
        issues: parsed.error.issues,
      })
    }

    try {
      const ipAddress = request.ip
      const userAgent = request.headers['user-agent']
      const result = await this.service.login(parsed.data, ipAddress, userAgent)

      return reply.code(200).send({
        statusCode: 200,
        message: 'Login successful.',
        data: result,
      })
    } catch (err: any) {
      return reply.code(err.statusCode ?? 500).send({
        statusCode: err.statusCode ?? 500,
        error: err.statusCode === 401 ? 'Unauthorized' : 'Internal Server Error',
        message: err.message ?? 'Something went wrong.',
      })
    }
  }

  // ── POST /auth/refresh ─────────────────────────────────────

  refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = refreshTokenSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parsed.error.issues[0]?.message ?? 'Invalid input',
      })
    }

    try {
      const result = await this.service.refresh(parsed.data)
      return reply.code(200).send({
        statusCode: 200,
        message: 'Token refreshed successfully.',
        data: result,
      })
    } catch (err: any) {
      return reply.code(err.statusCode ?? 500).send({
        statusCode: err.statusCode ?? 500,
        error: 'Unauthorized',
        message: err.message ?? 'Something went wrong.',
      })
    }
  }

  // ── POST /auth/logout ──────────────────────────────────────

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as { refreshToken?: string }

    if (!refreshToken) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Refresh token is required.',
      })
    }

    try {
      const result = await this.service.logout(refreshToken)
      return reply.code(200).send({ statusCode: 200, ...result })
    } catch (err: any) {
      return reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Something went wrong.',
      })
    }
  }

  // ── POST /auth/logout-all ──────────────────────────────────

  logoutAll = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.service.logoutAll(request.authenticatedUser.id)
      return reply.code(200).send({ statusCode: 200, ...result })
    } catch (err: any) {
      return reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Something went wrong.',
      })
    }
  }

  // ── GET /auth/me ───────────────────────────────────────────

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.service.getMe(request.authenticatedUser.id)
      return reply.code(200).send({
        statusCode: 200,
        data: result,
      })
    } catch (err: any) {
      return reply.code(err.statusCode ?? 500).send({
        statusCode: err.statusCode ?? 500,
        error: 'Internal Server Error',
        message: err.message ?? 'Something went wrong.',
      })
    }
  }
}
