// ─────────────────────────────────────────────────────────────
// Podara — AppError
//
// Base error class for all application-level errors.
// Every intentional error thrown in services or controllers
// must extend AppError — never throw raw Error instances.
//
// Benefits:
//   - Typed statusCode on every error
//   - Unique error codes for client-side handling
//   - isOperational flag separates expected errors (404, 401)
//     from programmer mistakes (500) — critical for alerting
// ─────────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number
  public readonly errorCode: string
  public readonly isOperational: boolean // true = expected, false = bug

  constructor(message: string, statusCode: number, errorCode: string, isOperational = true) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.errorCode = errorCode
    this.isOperational = isOperational

    // Restore prototype chain — required when extending built-in classes in TS
    Object.setPrototypeOf(this, new.target.prototype)

    // Capture clean stack trace excluding AppError constructor frame
    Error.captureStackTrace(this, this.constructor)
  }
}
