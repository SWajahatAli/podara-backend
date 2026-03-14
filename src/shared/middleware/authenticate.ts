import type { FastifyRequest, FastifyReply } from 'fastify'
import type { JwtPayload, AuthenticatedUser, Role } from '../types/index.js'

// ─────────────────────────────────────────────────────────────
// Podara — Authentication Middleware
// ─────────────────────────────────────────────────────────────

// Verifies JWT and attaches user to request
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const payload = await request.jwtVerify<JwtPayload>()

    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    }
  } catch {
    reply.code(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or expired token.',
    })
  }
}

// Role-based access control guard
// Usage: preHandler: [authenticate, requireRole(Role.ADMIN)]
export function requireRole(...roles: Role[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.user) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required.',
      })
    }

    if (!roles.includes(request.authenticatedUser.role)) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to access this resource.',
      })
    }
  }
}
