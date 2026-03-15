// ─────────────────────────────────────────────────────────────
// Podara — Standard API Response Format
//
// Every response from the API — success or error — follows
// this exact envelope. No exceptions.
//
// Success envelope:
// {
//   "success": true,
//   "statusCode": 200,
//   "message": "Login successful.",
//   "data": { ... },
//   "meta": { ... },       ← optional, for pagination etc.
//   "timestamp": "...",
//   "requestId": "..."
// }
//
// Error envelope:
// {
//   "success": false,
//   "statusCode": 404,
//   "errorCode": "NOT_FOUND",
//   "message": "User not found.",
//   "issues": [...],       ← optional, for validation errors
//   "timestamp": "...",
//   "requestId": "..."
// }
// ─────────────────────────────────────────────────────────────

// ── Response Types ─────────────────────────────────────────────

export interface PaginationMeta {
  total: number
  page: number
  perPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface SuccessResponse<T = unknown> {
  success: true
  statusCode: number
  message: string
  data: T
  meta?: PaginationMeta | Record<string, unknown>
  timestamp: string
  requestId: string
}

export interface ErrorResponse {
  success: false
  statusCode: number
  errorCode: string
  message: string
  issues?: Array<{ field: string; message: string }> // validation errors
  timestamp: string
  requestId: string
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse

// ── Response Builder ───────────────────────────────────────────
// Static factory — use these in every controller.
// Never construct raw response objects manually.

export class ApiResponseBuilder {
  // ── Success ──────────────────────────────────────────────────

  static success<T>(
    data: T,
    message: string,
    statusCode = 200,
    requestId = '',
    meta?: PaginationMeta | Record<string, unknown>,
  ): SuccessResponse<T> {
    return {
      success: true,
      statusCode,
      message,
      data,
      ...(meta !== undefined && { meta }),
      timestamp: new Date().toISOString(),
      requestId,
    }
  }

  // ── Created (201) ────────────────────────────────────────────

  static created<T>(data: T, message: string, requestId = ''): SuccessResponse<T> {
    return ApiResponseBuilder.success(data, message, 201, requestId)
  }

  // ── No Content (204) ─────────────────────────────────────────
  // Returns null data — used for DELETE or fire-and-forget actions

  static noContent(message: string, requestId = ''): SuccessResponse<null> {
    return ApiResponseBuilder.success(null, message, 204, requestId)
  }

  // ── Paginated ────────────────────────────────────────────────

  static paginated<T>(
    data: T,
    message: string,
    meta: PaginationMeta,
    requestId = '',
  ): SuccessResponse<T> {
    return ApiResponseBuilder.success(data, message, 200, requestId, meta)
  }

  // ── Error ────────────────────────────────────────────────────

  static error(
    message: string,
    statusCode: number,
    errorCode: string,
    requestId = '',
    issues?: Array<{ field: string; message: string }>,
  ): ErrorResponse {
    return {
      success: false,
      statusCode,
      errorCode,
      message,
      ...(issues !== undefined && issues.length > 0 && { issues }),
      timestamp: new Date().toISOString(),
      requestId,
    }
  }
}
