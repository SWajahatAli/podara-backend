import type { FastifyInstance } from 'fastify'
import { AuthService } from './auth.service.js'
import { AuthController } from './auth.controller.js'
import { authenticate } from '../../shared/middleware/authenticate.js'
import {
  AuthDataModel,
  MeUserModel,
  SuccessMessageModel,
  TokenPairModel,
  successResponse,
  commonErrors,
} from '../../shared/models/index.js'

// ─────────────────────────────────────────────────────────────
// Podara — Auth Routes
// Prefix: /api/v1/auth
// ─────────────────────────────────────────────────────────────

export async function authRoutes(fastify: FastifyInstance) {
  const service = new AuthService(fastify)
  const controller = new AuthController(service)

  // ── POST /register ─────────────────────────────────────────

  fastify.post('/register', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Register a new user',
      description:
        'Creates a new user account. A role-specific profile (Creator or Listener) is created in the same database transaction. Returns a token pair immediately — no separate login step required.',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'user@podara.io',
            description: 'Must be a valid email. Max 255 characters.',
          },
          password: {
            type: 'string',
            minLength: 8,
            maxLength: 72,
            example: 'SecurePass1',
            description: 'Min 8 chars. Must contain uppercase, lowercase, and a number.',
          },
          role: {
            type: 'string',
            enum: ['LISTENER', 'CREATOR'],
            default: 'LISTENER',
            description: 'Defaults to LISTENER if omitted. ADMIN accounts are created manually.',
          },
          displayName: {
            type: 'string',
            minLength: 2,
            maxLength: 50,
            example: 'Wajahat Ali',
            description: 'Required for CREATOR role. Falls back to email prefix if omitted.',
          },
          username: {
            type: 'string',
            minLength: 2,
            maxLength: 30,
            example: 'wajahat_ali',
            description: 'Optional for LISTENER. Alphanumeric + underscores only.',
          },
        },
      },
      response: {
        201: successResponse(
          201,
          'Account created successfully.',
          AuthDataModel,
          'Account created successfully.',
        ),
        ...commonErrors(['400', '409']),
      },
    },
    handler: controller.register,
  })

  // ── POST /login ────────────────────────────────────────────

  fastify.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Login',
      description:
        'Authenticates a user and returns a JWT access token and refresh token pair. Returns the same 401 error for wrong email and wrong password to prevent email enumeration attacks.',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@podara.io' },
          password: { type: 'string', example: 'SecurePass1' },
        },
      },
      response: {
        200: successResponse(200, 'Login successful.', AuthDataModel, 'Login successful.'),
        ...commonErrors(['400', '401', '403']),
      },
    },
    handler: controller.login,
  })

  // ── POST /refresh ──────────────────────────────────────────

  fastify.post('/refresh', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Refresh access token',
      description:
        'Issues a new access + refresh token pair. The old refresh token is immediately revoked (token rotation). The client must store the new refresh token and discard the old one.',
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: 'string',
            example: 'a3f9b2c1d4e5f6789abc...',
            description: 'The refresh token from login or previous refresh call.',
          },
        },
      },
      response: {
        200: successResponse(
          200,
          'Token refreshed successfully.',
          TokenPairModel,
          'Token refreshed successfully.',
        ),
        ...commonErrors(['400', '401']),
      },
    },
    handler: controller.refresh,
  })

  // ── POST /logout ───────────────────────────────────────────

  fastify.post('/logout', {
    preHandler: [authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Logout',
      description:
        'Revokes the current refresh token. The access token remains valid until it naturally expires (max 15 minutes). The client should discard both tokens on logout.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: 'string',
            example: 'a3f9b2c1d4e5f6789abc...',
          },
        },
      },
      response: {
        200: {
          description: 'Logged out successfully.',
          ...SuccessMessageModel,
        },
        ...commonErrors(['401']),
      },
    },
    handler: controller.logout,
  })

  // ── POST /logout-all ───────────────────────────────────────

  fastify.post('/logout-all', {
    preHandler: [authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Logout from all devices',
      description:
        'Revokes all active refresh tokens for the current user across all devices and sessions. Use this when the account may be compromised.',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Logged out from all devices.',
          ...SuccessMessageModel,
        },
        ...commonErrors(['401']),
      },
    },
    handler: controller.logoutAll,
  })

  // ── GET /me ────────────────────────────────────────────────

  fastify.get('/me', {
    preHandler: [authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Get current user',
      description:
        "Returns the full authenticated user profile including role-specific nested data. Exactly one of `creator` or `listener` will be populated based on the user's role. Both are null for ADMIN users.",
      security: [{ bearerAuth: [] }],
      response: {
        200: successResponse(200, 'Current user profile.', MeUserModel),
        ...commonErrors(['401', '404']),
      },
    },
    handler: controller.me,
  })
}
