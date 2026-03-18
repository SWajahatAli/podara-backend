import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// ─────────────────────────────────────────────────────────────
// Podara — Prisma Client Singleton
// Reuses a single PrismaClient instance across the app
// Prevents connection pool exhaustion in long-running servers
// ─────────────────────────────────────────────────────────────

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      '[Podara] DATABASE_URL is not defined. ' +
        'Check your .env file or Railway environment variables.',
    )
  }

  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error'] // verbose in dev
        : ['warn', 'error'], // quiet in production
  })
}

// Singleton pattern — reuse across hot reloads in development
// In production this is just a single instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
