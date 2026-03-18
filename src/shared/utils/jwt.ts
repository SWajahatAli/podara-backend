import { createHmac, randomBytes } from 'crypto'

// ─────────────────────────────────────────────────────────────
// Podara — JWT Utility
// Access token: short lived (15 minutes)
// Refresh token: long lived (30 days), stored in DB as hash
// ─────────────────────────────────────────────────────────────

export const JWT_ACCESS_EXPIRY = '15m'
export const JWT_REFRESH_EXPIRY = '30d'
export const JWT_REFRESH_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000

// Generate a secure random refresh token (not a JWT)
// Stored as a hash in the DB, sent raw to client
export function generateRefreshToken(): string {
  return randomBytes(64).toString('hex')
}

// Hash the refresh token before storing in DB
// Never store raw tokens — only hashes
export function hashRefreshToken(token: string): string {
  return createHmac('sha256', process.env.JWT_SECRET!).update(token).digest('hex')
}

// Build refresh token expiry date
export function refreshTokenExpiresAt(): Date {
  return new Date(Date.now() + JWT_REFRESH_EXPIRY_MS)
}
