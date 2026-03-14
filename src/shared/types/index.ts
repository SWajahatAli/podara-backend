// ─────────────────────────────────────────────────────────────
// Podara — Shared Types
// ─────────────────────────────────────────────────────────────

import type { Role } from '../../../generated/prisma/index.js'

// JWT payload stored inside every access token
export interface JwtPayload {
  sub: string // user id
  email: string
  role: Role
  iat?: number
  exp?: number
}

// Attached to every authenticated request
export interface AuthenticatedUser {
  id: string
  email: string
  role: Role
}

export type { Role }

// Fastify request augmentation
declare module 'fastify' {
  interface FastifyRequest {
    authenticatedUser: AuthenticatedUser
  }
}
