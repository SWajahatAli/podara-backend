// ─────────────────────────────────────────────────────────────
// Podara — Shared JSON Schema Models
// Used in route schemas for Fastify serialization + Swagger UI
//
// Rules:
//   - No $ref — all models are self-contained plain objects
//   - Fastify serializer strips unknown fields by default
//     so every field you want in the response must be listed
//   - 'example' values are OpenAPI annotations for Swagger UI
//   - nullable fields must have { type, nullable: true }
//   - All date fields use { type: 'string', format: 'date-time' }
// ─────────────────────────────────────────────────────────────

// ── Primitives ─────────────────────────────────────────────────

const UUIDField = {
  type: "string",
  format: "uuid",
  example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
};
const EmailField = {
  type: "string",
  format: "email",
  example: "user@podara.io",
};
const DateTimeField = {
  type: "string",
  format: "date-time",
  example: "2026-03-01T00:00:00.000Z",
};
const NullableStringField = { type: "string", nullable: true, default: null };
const NullableUrlField = {
  type: "string",
  format: "uri",
  nullable: true,
  default: null,
  example: "https://cdn.podara.io/avatars/abc.jpg",
};

// ─────────────────────────────────────────────────────────────
// SECTION 1 — Error Models
// Used across all modules as standard error response shapes
// ─────────────────────────────────────────────────────────────

/**
 * Generic error envelope.
 * Used for: 400, 401, 403, 404, 409, 429, 500
 */
export const ErrorModel = {
  type: "object",
  properties: {
    statusCode: { type: "number", example: 400 },
    error: { type: "string", example: "Bad Request" },
    message: { type: "string", example: "Something went wrong." },
  },
} as const;

/**
 * Validation error — extended with per-field issues array.
 * Used for: 400 when Zod validation fails
 */
export const ValidationErrorModel = {
  type: "object",
  properties: {
    statusCode: { type: "number", example: 400 },
    error: { type: "string", example: "Validation Error" },
    message: { type: "string", example: "Invalid request body." },
    issues: {
      type: "array",
      description: "Per-field validation errors from Zod",
      items: {
        type: "object",
        properties: {
          field: { type: "string", example: "email" },
          message: { type: "string", example: "Invalid email address." },
        },
      },
    },
  },
} as const;

/**
 * Simple success envelope with no data payload.
 * Used for: logout, logout-all, and any fire-and-forget action
 */
export const SuccessMessageModel = {
  type: "object",
  properties: {
    statusCode: { type: "number", example: 200 },
    message: { type: "string", example: "Operation completed successfully." },
  },
} as const;

// ─────────────────────────────────────────────────────────────
// SECTION 2 — User Models
// ─────────────────────────────────────────────────────────────

/**
 * Minimal user object returned in auth responses.
 * Intentionally excludes: passwordHash, deletedAt, isBanned, banReason.
 * Never expose sensitive fields — Fastify serializer strips unknowns
 * but explicit exclusion here documents the intent clearly.
 */
export const UserModel = {
  type: "object",
  properties: {
    id: { ...UUIDField },
    email: { ...EmailField },
    role: {
      type: "string",
      enum: ["LISTENER", "CREATOR", "ADMIN"],
      example: "LISTENER",
      description: "User role. Determines which profile fields are populated.",
    },
    isVerified: {
      type: "boolean",
      example: false,
      description: "Whether the user has verified their email address.",
    },
    createdAt: { ...DateTimeField },
  },
} as const;

/**
 * Full user profile returned by GET /me.
 * Extends UserModel with role-specific nested profiles.
 * Exactly one of creator/listener will be populated depending on role.
 * ADMIN users will have both as null.
 */
export const MeUserModel = {
  type: "object",
  properties: {
    id: { ...UUIDField },
    email: { ...EmailField },
    role: {
      type: "string",
      enum: ["LISTENER", "CREATOR", "ADMIN"],
      example: "CREATOR",
    },
    isVerified: { type: "boolean", example: false },
    createdAt: { ...DateTimeField },
    lastLoginAt: {
      type: "string",
      format: "date-time",
      nullable: true,
      example: "2026-03-11T10:00:00.000Z",
      description:
        "Timestamp of last successful login. Null if never logged in after registration.",
    },
    creator: {
      type: "object",
      nullable: true,
      description:
        "Populated when role is CREATOR. Null for LISTENER and ADMIN.",
      properties: {
        id: { ...UUIDField },
        displayName: { type: "string", example: "Wajahat Ali" },
        slug: {
          type: "string",
          example: "wajahat-ali",
          description:
            "URL-safe creator identifier. Used in public URLs: podara.io/c/wajahat-ali",
        },
        bio: {
          ...NullableStringField,
          example: "Software engineer building in public.",
        },
        avatarUrl: { ...NullableUrlField },
        coverUrl: {
          ...NullableUrlField,
          example: "https://cdn.podara.io/covers/abc.jpg",
        },
        isVerified: {
          type: "boolean",
          example: false,
          description: "Platform-verified creator badge.",
        },
        episodeCount: {
          type: "number",
          example: 12,
          description: "Denormalized total published episode count.",
        },
        subscriberCount: {
          type: "number",
          example: 340,
          description: "Denormalized total active subscriber count.",
        },
        createdAt: { ...DateTimeField },
      },
    },
    listener: {
      type: "object",
      nullable: true,
      description:
        "Populated when role is LISTENER. Null for CREATOR and ADMIN.",
      properties: {
        id: { ...UUIDField },
        username: { ...NullableStringField, example: "wajahat_listener" },
        avatarUrl: { ...NullableUrlField },
        createdAt: { ...DateTimeField },
      },
    },
  },
} as const;

// ─────────────────────────────────────────────────────────────
// SECTION 3 — Auth Models
// ─────────────────────────────────────────────────────────────

/**
 * JWT access token + opaque refresh token pair.
 * Returned on register, login, and refresh.
 */
export const TokenPairModel = {
  type: "object",
  properties: {
    accessToken: {
      type: "string",
      example:
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1dWlkIiwicm9sZSI6IkxJU1RFTkVSIn0.sig",
      description:
        "JWT. Expires in 15 minutes. Send in Authorization: Bearer <token> header.",
    },
    refreshToken: {
      type: "string",
      example:
        "a3f9b2c1d4e5f6789abc0123456789abcdef0123456789abcdef0123456789ab",
      description:
        "Opaque 64-byte hex token. Expires in 30 days. Rotates on every use — always store the latest one.",
    },
  },
} as const;

/**
 * Auth response data — user summary + token pair.
 * Returned by POST /register and POST /login.
 */
export const AuthDataModel = {
  type: "object",
  properties: {
    user: {
      ...UserModel,
      description:
        "Minimal user object. Use GET /me for full profile with role-specific fields.",
    },
    accessToken: { ...TokenPairModel.properties.accessToken },
    refreshToken: { ...TokenPairModel.properties.refreshToken },
  },
} as const;

// ─────────────────────────────────────────────────────────────
// SECTION 4 — Response Envelope Builders
// Wrap data models in the standard Podara response envelope:
// { statusCode, message?, data? }
// ─────────────────────────────────────────────────────────────

/**
 * Wraps any data model in the standard success envelope.
 *
 * Usage:
 *   response: {
 *     201: successResponse(201, 'Account created successfully.', AuthDataModel),
 *     200: successResponse(200, 'Login successful.', AuthDataModel),
 *   }
 */
export function successResponse(
  statusCode: number,
  description: string,
  dataModel: Record<string, unknown>,
  message?: string,
) {
  return {
    description,
    type: "object",
    properties: {
      statusCode: { type: "number", example: statusCode },
      ...(message !== undefined
        ? { message: { type: "string", example: message } }
        : {}),
      data: dataModel,
    },
  };
}

/**
 * Standard error responses used on almost every route.
 * Import and spread into response schemas to avoid repetition.
 *
 * Usage:
 *   response: {
 *     200: successResponse(...),
 *     ...commonErrors(['400', '401', '403']),
 *   }
 */
export function commonErrors(
  codes: Array<"400" | "401" | "403" | "404" | "409" | "429" | "500">,
) {
  const map: Record<string, unknown> = {
    400: { description: "Validation error", ...ValidationErrorModel },
    401: {
      description: "Unauthorized — invalid or missing token",
      ...ErrorModel,
    },
    403: {
      description: "Forbidden — insufficient permissions or account suspended",
      ...ErrorModel,
    },
    404: { description: "Resource not found", ...ErrorModel },
    409: { description: "Conflict — resource already exists", ...ErrorModel },
    429: {
      description: "Too many requests — rate limit exceeded",
      ...ErrorModel,
    },
    500: { description: "Internal server error", ...ErrorModel },
  };

  return Object.fromEntries(codes.map((code) => [code, map[code]]));
}
