import type { FastifyInstance } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

// ─────────────────────────────────────────────────────────────
// Podara — Swagger Configuration
// Docs available at: /docs
// OpenAPI JSON at:   /docs/json
// ─────────────────────────────────────────────────────────────

export async function registerSwagger(fastify: FastifyInstance) {
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Podara API',
        description: `
## 🎙️ Podara Backend API

Independent podcast creator platform. Creators upload episodes, listeners subscribe and stream.

### Authentication
Most endpoints require a **Bearer token** in the Authorization header:
\`\`\`
Authorization: Bearer <accessToken>
\`\`\`

Access tokens expire in **15 minutes**. Use \`POST /api/v1/auth/refresh\` to get a new one.

### Roles
| Role | Description |
|---|---|
| \`LISTENER\` | Can browse, subscribe, and stream episodes |
| \`CREATOR\` | Can upload and manage podcast episodes |
| \`ADMIN\` | Platform administration |
        `,
        version: '1.0.0',
        contact: {
          name: 'Wajahat Ali',
          email: 'wajahat@podara.io',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Local Development',
        },
        {
          url: 'https://podara-backend.up.railway.app',
          description: 'Production (Railway)',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT access token. Expires in 15 minutes.',
          },
        },
        schemas: {
          ValidationError: {
            type: 'object',
            properties: {
              statusCode: { type: 'number', example: 400 },
              error: { type: 'string', example: 'Validation Error' },
              message: { type: 'string', example: 'Invalid email address' },
              issues: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    path: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          UnauthorizedError: {
            type: 'object',
            properties: {
              statusCode: { type: 'number', example: 401 },
              error: { type: 'string', example: 'Unauthorized' },
              message: { type: 'string', example: 'Invalid or expired token.' },
            },
          },
          ForbiddenError: {
            type: 'object',
            properties: {
              statusCode: { type: 'number', example: 403 },
              error: { type: 'string', example: 'Forbidden' },
              message: {
                type: 'string',
                example: 'You do not have permission to access this resource.',
              },
            },
          },
          NotFoundError: {
            type: 'object',
            properties: {
              statusCode: { type: 'number', example: 404 },
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string', example: 'User not found.' },
            },
          },
          ConflictError: {
            type: 'object',
            properties: {
              statusCode: { type: 'number', example: 409 },
              error: { type: 'string', example: 'Conflict' },
              message: {
                type: 'string',
                example: 'An account with this email already exists.',
              },
            },
          },
          User: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
              },
              email: {
                type: 'string',
                format: 'email',
                example: 'user@podara.io',
              },
              role: {
                type: 'string',
                enum: ['LISTENER', 'CREATOR', 'ADMIN'],
                example: 'LISTENER',
              },
              isVerified: { type: 'boolean', example: false },
            },
          },
          CreatorProfile: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              displayName: { type: 'string', example: 'Wajahat Ali' },
              slug: { type: 'string', example: 'wajahat-ali' },
              avatarUrl: { type: 'string', nullable: true, example: null },
              isVerified: { type: 'boolean', example: false },
            },
          },
          ListenerProfile: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              username: {
                type: 'string',
                nullable: true,
                example: 'listener_user',
              },
              avatarUrl: { type: 'string', nullable: true, example: null },
            },
          },
          TokenPair: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiJ9...',
                description: 'JWT access token. Expires in 15 minutes.',
              },
              refreshToken: {
                type: 'string',
                example: 'a3f9b2c1d4e5f6...',
                description: 'Opaque refresh token. Expires in 30 days. Rotates on every use.',
              },
            },
          },
        },
      },
      tags: [
        {
          name: 'Auth',
          description: 'Authentication and authorization endpoints',
        },
        { name: 'Health', description: 'Server health check' },
      ],
    },
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  })
}
