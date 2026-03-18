import { AppError } from './app_error.js'

// ─────────────────────────────────────────────────────────────
// Podara — HTTP Error Classes
//
// Concrete error classes for every HTTP status code used in
// the Podara API. Each class:
//   - Has a fixed statusCode
//   - Has a unique errorCode for client-side switch handling
//   - Accepts a custom message or falls back to a sensible default
//   - Accepts optional metadata for extra context in the response
//
// Usage in service:
//   throw new NotFoundError('User not found.')
//   throw new ConflictError('Email already registered.')
//   throw new ValidationError('Invalid input.', issues)
//
// The global error handler catches all of these automatically.
// ─────────────────────────────────────────────────────────────

export type ErrorMetadata = Record<string, unknown>

// ── 400 Bad Request ────────────────────────────────────────────

export class BadRequestError extends AppError {
  public readonly metadata?: ErrorMetadata

  constructor(message = 'Bad request.', metadata?: ErrorMetadata) {
    super(message, 400, 'BAD_REQUEST')
    if (metadata) this.metadata = metadata
  }
}

// ── 400 Validation Error ───────────────────────────────────────
// Zod validation failures — carries per-field issues array

export interface ValidationIssue {
  field: string
  message: string
}

export class ValidationError extends AppError {
  public readonly issues: ValidationIssue[]

  constructor(message = 'Validation failed.', issues: ValidationIssue[] = []) {
    super(message, 400, 'VALIDATION_ERROR')
    this.issues = issues
  }
}

// ── 401 Unauthorized ───────────────────────────────────────────

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

// ── 403 Forbidden ──────────────────────────────────────────────

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 403, 'FORBIDDEN')
  }
}

// ── 404 Not Found ──────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.') {
    super(message, 404, 'NOT_FOUND')
  }
}

// ── 409 Conflict ───────────────────────────────────────────────

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists.') {
    super(message, 409, 'CONFLICT')
  }
}

// ── 410 Gone ───────────────────────────────────────────────────
// For expired tokens, deleted resources referenced by ID

export class GoneError extends AppError {
  constructor(message = 'This resource no longer exists.') {
    super(message, 410, 'GONE')
  }
}

// ── 422 Unprocessable Entity ───────────────────────────────────
// Semantically invalid request — passes schema but fails business rules

export class UnprocessableError extends AppError {
  constructor(message = 'The request could not be processed.') {
    super(message, 422, 'UNPROCESSABLE_ENTITY')
  }
}

// ── 429 Too Many Requests ──────────────────────────────────────

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please slow down.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
  }
}

// ── 500 Internal Server Error ──────────────────────────────────
// Non-operational — always means a bug. isOperational = false
// triggers alerts in the error handler.

export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred.') {
    super(message, 500, 'INTERNAL_SERVER_ERROR', false)
  }
}

// ── 503 Service Unavailable ────────────────────────────────────
// DB unreachable, Redis down, upstream service failure

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable. Please try again later.') {
    super(message, 503, 'SERVICE_UNAVAILABLE')
  }
}
