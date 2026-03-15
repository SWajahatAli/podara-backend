// ─────────────────────────────────────────────────────────────
// Podara — Errors barrel export
// Import everything from here — never from individual files
//
// Usage:
//   import { NotFoundError, ValidationError } from '@/shared/errors'
// ─────────────────────────────────────────────────────────────

export { AppError } from './app_error.js'
export type { ErrorMetadata } from './http_error.js'
export type { ValidationIssue } from './http_error.js'
export {
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  GoneError,
  UnprocessableError,
  RateLimitError,
  InternalError,
  ServiceUnavailableError,
} from './http_error.js'