import { Role } from '../../../generated/prisma/index.js'
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────
// Podara — Auth Validation Schemas (Zod v4)
// ─────────────────────────────────────────────────────────────

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// ── Register ─────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.email('Invalid email address'),
  password: passwordSchema,
  role: z.enum([Role.LISTENER, Role.CREATOR]).default(Role.LISTENER),
  // Creator-specific fields (optional at registration)
  displayName: z.string().min(2).max(50).optional(),
  // Listener-specific fields (optional at registration)
  username: z.string().min(2).max(30).optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>

// ── Login ────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>

// ── Refresh Token ────────────────────────────────────────────

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>

// ── Forgot Password ──────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: z.email('Invalid email address'),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

// ── Reset Password ───────────────────────────────────────────

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
