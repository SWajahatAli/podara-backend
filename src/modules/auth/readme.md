# 🔐 Auth Module

> Handles all authentication and authorization for Podara. Covers registration, login, JWT access tokens, refresh token rotation, logout, and role-based access control.

---

## 📋 Table of Contents

- [Overview](#overview)
- [File Structure](#file-structure)
- [Architecture](#architecture)
- [Security Design](#security-design)
- [Endpoints](#endpoints)
- [Business Logic](#business-logic)
- [BDD Test Scenarios](#bdd-test-scenarios)
- [Known Limitations](#known-limitations)
- [Future Enhancements](#future-enhancements)
- [Environment Variables](#environment-variables)

---

## Overview

The auth module is the entry point for all users — Listeners, Creators, and Admins. It issues short-lived JWT access tokens (15 minutes) and long-lived refresh tokens (30 days). Refresh tokens rotate on every use — each refresh call revokes the old token and issues a brand new one, preventing token reuse attacks.

Passwords are never stored in plain text. They are hashed using PBKDF2-SHA512 with 100,000 iterations and a cryptographically random salt. Refresh tokens are never stored raw — only their HMAC-SHA256 hash is persisted in the database. Even if the database is fully compromised, the attacker cannot use stored hashes to impersonate users.

---

## 📁 File Structure

```
src/modules/auth/
├── auth.schema.ts       ← Zod v4 request validation schemas + response types
├── auth.service.ts      ← all business logic and DB interaction
├── auth.controller.ts   ← HTTP layer — parse request, call service, send response
├── auth.routes.ts       ← Fastify route registration with rate limits + Swagger schemas
└── README.md            ← this file
```

---

## 🏗️ Architecture

```
HTTP Request
     │
     ▼
auth.routes.ts        ← rate limiting, Swagger schema, preHandler hooks
     │
     ▼
authenticate.ts       ← JWT verification (protected routes only)
     │
     ▼
auth.controller.ts    ← Zod validation, parse body, call service, shape response
     │
     ▼
auth.service.ts       ← business logic, DB queries via Prisma, token generation
     │
     ▼
Supabase PostgreSQL   ← users, refresh_tokens tables
```

Each layer has a single responsibility. The controller never touches the DB. The service never touches HTTP. This makes each layer independently testable.

---

## 🔒 Security Design

### Password Hashing

PBKDF2-SHA512 with 100,000 iterations and a 32-byte random salt. Stored format:

```
iterations:hex(salt):hex(hash)
100000:a3f9b2c1...:d4e5f678...
```

The iteration count is stored alongside the hash so it can be increased in future without invalidating existing passwords — users get re-hashed transparently on next login.

### Refresh Token Storage

Raw tokens are never persisted. Only HMAC-SHA256 hashes (keyed with `JWT_SECRET`) are stored. The full flow:

```
Server generates → raw 64-byte hex token
Server stores   → HMAC-SHA256(token, JWT_SECRET)
Server returns  → raw token to client
Client sends    → raw token on refresh
Server hashes   → HMAC-SHA256(incoming, JWT_SECRET)
Server compares → hash lookup in DB
```

### Token Rotation

Every `/refresh` call atomically revokes the old token and issues a new one. Reusing a rotated token immediately returns `401`.

### Email Enumeration Prevention

Login returns the exact same `401 Invalid email or password.` error regardless of whether the email exists or the password is wrong. Timing attacks are mitigated by always running the password comparison even when the user is not found.

### Transactional Registration

User creation and role-specific profile creation happen inside a single Prisma transaction. If anything fails mid-transaction, the entire operation rolls back — no orphaned users in the database.

### Rate Limiting

| Endpoint         | Limit                  |
| ---------------- | ---------------------- |
| `POST /register` | 10 req / min           |
| `POST /login`    | 10 req / min           |
| `POST /refresh`  | 20 req / min           |
| All others       | 100 req / min (global) |

---

## 🌐 Endpoints

### `POST /api/v1/auth/register`

Registers a new user. Creates a base `User` record and a role-specific profile in a single transaction.

**Auth required:** No
**Rate limit:** 10 req/min

**Request body:**

```json
{
  "email": "user@podara.io",
  "password": "SecurePass1",
  "role": "LISTENER",
  "username": "wajahat_ali",
  "displayName": "Wajahat Ali"
}
```

| Field         | Type   | Required | Validation                                                              |
| ------------- | ------ | -------- | ----------------------------------------------------------------------- |
| `email`       | string | ✅       | Valid email format, max 255 chars                                       |
| `password`    | string | ✅       | Min 8 chars, max 72, 1 uppercase, 1 lowercase, 1 number                 |
| `role`        | enum   | ❌       | `LISTENER` or `CREATOR` — defaults to `LISTENER`                        |
| `displayName` | string | ❌       | Required if `CREATOR`. Min 2, max 50 chars. Falls back to email prefix  |
| `username`    | string | ❌       | Optional for `LISTENER`. Min 2, max 30. Alphanumeric + underscores only |

**Success `201`:**

```json
{
  "statusCode": 201,
  "message": "Account created successfully.",
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "user@podara.io",
      "role": "LISTENER",
      "isVerified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "a3f9b2c1d4e5f6789abc..."
  }
}
```

**Errors:**

| Status | Error                 | Reason                                             |
| ------ | --------------------- | -------------------------------------------------- |
| `400`  | Validation Error      | Invalid email, weak password, invalid field values |
| `409`  | Conflict              | Email already registered                           |
| `500`  | Internal Server Error | Unexpected failure                                 |

---

### `POST /api/v1/auth/login`

Authenticates a user. Updates `lastLoginAt` on success.

**Auth required:** No
**Rate limit:** 10 req/min

**Request body:**

```json
{
  "email": "user@podara.io",
  "password": "SecurePass1"
}
```

**Success `200`:**

```json
{
  "statusCode": 200,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "user@podara.io",
      "role": "CREATOR",
      "isVerified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "a3f9b2c1d4e5f6789abc..."
  }
}
```

**Errors:**

| Status | Error                 | Reason                                                               |
| ------ | --------------------- | -------------------------------------------------------------------- |
| `400`  | Validation Error      | Malformed request body                                               |
| `401`  | Unauthorized          | Invalid email or password (same message for both — anti-enumeration) |
| `403`  | Forbidden             | Account deactivated or banned                                        |
| `500`  | Internal Server Error | Unexpected failure                                                   |

---

### `POST /api/v1/auth/refresh`

Issues a new token pair. Old refresh token is immediately revoked.

**Auth required:** No
**Rate limit:** 20 req/min

**Request body:**

```json
{
  "refreshToken": "a3f9b2c1d4e5f6789abc..."
}
```

**Success `200`:**

```json
{
  "statusCode": 200,
  "message": "Token refreshed successfully.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "x7k2m9p4d1e2f3456789..."
  }
}
```

**Errors:**

| Status | Error                 | Reason                                     |
| ------ | --------------------- | ------------------------------------------ |
| `400`  | Validation Error      | Missing refresh token field                |
| `401`  | Unauthorized          | Invalid, expired, or already revoked token |
| `403`  | Forbidden             | Account deactivated or banned              |
| `500`  | Internal Server Error | Unexpected failure                         |

---

### `POST /api/v1/auth/logout`

Revokes the current refresh token. Access token remains valid until natural expiry (max 15 min).

**Auth required:** Yes — `Authorization: Bearer <accessToken>`

**Request body:**

```json
{
  "refreshToken": "a3f9b2c1d4e5f6789abc..."
}
```

**Success `200`:**

```json
{
  "statusCode": 200,
  "message": "Logged out successfully."
}
```

**Errors:**

| Status | Error            | Reason                          |
| ------ | ---------------- | ------------------------------- |
| `400`  | Validation Error | Missing refresh token field     |
| `401`  | Unauthorized     | Missing or invalid Bearer token |

---

### `POST /api/v1/auth/logout-all`

Revokes all active refresh tokens for the user across all devices.

**Auth required:** Yes — `Authorization: Bearer <accessToken>`

**Request body:** None

**Success `200`:**

```json
{
  "statusCode": 200,
  "message": "Logged out from all devices."
}
```

**Errors:**

| Status | Error        | Reason                          |
| ------ | ------------ | ------------------------------- |
| `401`  | Unauthorized | Missing or invalid Bearer token |

---

### `GET /api/v1/auth/me`

Returns the full authenticated user profile with role-specific nested data.

**Auth required:** Yes — `Authorization: Bearer <accessToken>`

**Success `200`:**

```json
{
  "statusCode": 200,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "creator@podara.io",
    "role": "CREATOR",
    "isVerified": false,
    "createdAt": "2026-03-01T00:00:00.000Z",
    "lastLoginAt": "2026-03-11T10:00:00.000Z",
    "creator": {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "displayName": "Wajahat Ali",
      "slug": "wajahat-ali",
      "bio": null,
      "avatarUrl": null,
      "isVerified": false,
      "episodeCount": 0,
      "subscriberCount": 0
    },
    "listener": null
  }
}
```

**Errors:**

| Status | Error        | Reason                              |
| ------ | ------------ | ----------------------------------- |
| `401`  | Unauthorized | Missing or invalid Bearer token     |
| `404`  | Not Found    | User deleted after token was issued |

---

## ⚙️ Business Logic

### Slug Generation for Creators

Auto-generated from the email prefix. Special characters replaced with hyphens. Lowercased. If slug already exists a 4-char random alphanumeric suffix is appended:

```
wajahat.ali@podara.io  →  wajahat-ali
wajahat.ali@podara.io  →  wajahat-ali-x4k2  (if wajahat-ali taken)
```

### IP and Device Tracking

Every refresh token stores `ipAddress` and `deviceInfo` (User-Agent) at creation time. This data powers the future active sessions feature.

### Soft Delete Behaviour

Soft-deleted users (`deletedAt IS NOT NULL`) are treated as non-existent. Login returns `401`, not `404`, to avoid confirming the email was ever registered.

### Role Profiles

| Role       | Profile created   | Profile fields                                        |
| ---------- | ----------------- | ----------------------------------------------------- |
| `LISTENER` | `listeners` table | `username`, `avatarUrl`                               |
| `CREATOR`  | `creators` table  | `displayName`, `slug`, `bio`, `avatarUrl`, `coverUrl` |
| `ADMIN`    | None              | Managed manually in DB                                |

---

## 🧪 BDD Test Scenarios

> Format: **Given** [precondition] **When** [action] **Then** [expected outcome]

---

### Feature: User Registration

---

**Scenario: Successful registration as LISTENER**

```
Given no account exists for "listener@podara.io"
When  POST /api/v1/auth/register with valid email, password, role "LISTENER"
Then  response status is 201
And   response contains accessToken and refreshToken
And   response user.role is "LISTENER"
And   response user.isVerified is false
And   a Listener profile is created in the DB
And   passwordHash is NOT present in the response
```

---

**Scenario: Successful registration as CREATOR**

```
Given no account exists for "creator@podara.io"
When  POST /api/v1/auth/register with valid email, password, role "CREATOR", displayName "Wajahat Ali"
Then  response status is 201
And   response user.role is "CREATOR"
And   a Creator profile is created with displayName "Wajahat Ali"
And   a slug is auto-generated from the email prefix
And   the User and Creator records are created in the same transaction
```

---

**Scenario: CREATOR registration without displayName falls back to email prefix**

```
Given no account exists for "wajahat@podara.io"
When  POST /api/v1/auth/register with role "CREATOR" and no displayName
Then  response status is 201
And   Creator profile displayName is "wajahat" (email prefix)
And   Creator slug is "wajahat"
```

---

**Scenario: Registration with duplicate email**

```
Given an account already exists for "existing@podara.io"
When  POST /api/v1/auth/register with email "existing@podara.io"
Then  response status is 409
And   response error is "Conflict"
And   response message is "An account with this email already exists."
And   no new User record is created in the DB
```

---

**Scenario: Registration with weak password — no uppercase**

```
Given no precondition
When  POST /api/v1/auth/register with password "weakpass1"
Then  response status is 400
And   response error is "Validation Error"
And   issues array contains a message about uppercase requirement
```

---

**Scenario: Registration with weak password — no number**

```
Given no precondition
When  POST /api/v1/auth/register with password "WeakPassOnly"
Then  response status is 400
And   response error is "Validation Error"
And   issues array contains a message about number requirement
```

---

**Scenario: Registration with password under 8 characters**

```
Given no precondition
When  POST /api/v1/auth/register with password "Ab1"
Then  response status is 400
And   issues array contains a message about minimum length
```

---

**Scenario: Registration with invalid email format**

```
Given no precondition
When  POST /api/v1/auth/register with email "not-an-email"
Then  response status is 400
And   issues array contains a message about invalid email format
```

---

**Scenario: Registration with email exceeding 255 characters**

```
Given no precondition
When  POST /api/v1/auth/register with email of 256 characters
Then  response status is 400
And   issues array contains a message about email length
```

---

**Scenario: Concurrent registration with same email**

```
Given no account exists for "race@podara.io"
When  two simultaneous POST /api/v1/auth/register requests with "race@podara.io"
Then  exactly one request returns 201
And   exactly one request returns 409
And   exactly one User record exists in the DB
```

---

**Scenario: Registration as ADMIN role**

```
Given no account exists for "admin@podara.io"
When  POST /api/v1/auth/register with role "ADMIN"
Then  response status is 201
And   user.role is "ADMIN"
And   no Creator or Listener profile is created
```

---

**Scenario: Registration with SQL injection in email field**

```
Given no precondition
When  POST /api/v1/auth/register with email "'; DROP TABLE users; --@x.com"
Then  response status is 400
And   Zod rejects the input before it reaches the DB
And   database remains unaffected
```

---

**Scenario: Registration with username containing special characters**

```
Given no precondition
When  POST /api/v1/auth/register with username "user name!"
Then  response status is 400
And   issues array contains a message about alphanumeric and underscore only
```

---

### Feature: User Login

---

**Scenario: Successful login**

```
Given a registered account exists for "user@podara.io" with password "SecurePass1"
When  POST /api/v1/auth/login with correct credentials
Then  response status is 200
And   response message is "Login successful."
And   response contains accessToken and refreshToken
And   lastLoginAt is updated in the DB
And   passwordHash is NOT present in the response
```

---

**Scenario: Login with wrong password**

```
Given a registered account exists for "user@podara.io"
When  POST /api/v1/auth/login with email "user@podara.io" and password "WrongPass1"
Then  response status is 401
And   response message is "Invalid email or password."
```

---

**Scenario: Login with non-existent email**

```
Given no account exists for "ghost@podara.io"
When  POST /api/v1/auth/login with email "ghost@podara.io"
Then  response status is 401
And   response message is "Invalid email or password."
And   message is identical to wrong password case (anti-enumeration)
```

---

**Scenario: Login with banned account**

```
Given an account exists for "banned@podara.io" with isBanned = true
When  POST /api/v1/auth/login with correct credentials
Then  response status is 403
And   response message contains "suspended" or "banned"
```

---

**Scenario: Login with deactivated account**

```
Given an account exists for "inactive@podara.io" with isActive = false
When  POST /api/v1/auth/login with correct credentials
Then  response status is 403
And   response message contains "deactivated"
```

---

**Scenario: Login with soft-deleted account**

```
Given an account exists for "deleted@podara.io" with deletedAt set
When  POST /api/v1/auth/login with email "deleted@podara.io"
Then  response status is 401
And   response message is "Invalid email or password." (same as non-existent — no confirmation)
```

---

**Scenario: Login exceeds rate limit**

```
Given a registered account
When  POST /api/v1/auth/login is called 11 times within 1 minute
Then  the 11th response status is 429
And   response message mentions rate limiting
```

---

### Feature: Token Refresh

---

**Scenario: Successful token refresh**

```
Given a valid refresh token obtained from login
When  POST /api/v1/auth/refresh with that refresh token
Then  response status is 200
And   response contains a new accessToken
And   response contains a new refreshToken (different from the old one)
And   the old refresh token is marked as revoked in the DB
```

---

**Scenario: Refresh with already-rotated token (reuse attack)**

```
Given a refresh token that was already used once to obtain a new token pair
When  POST /api/v1/auth/refresh with the old (already-rotated) refresh token
Then  response status is 401
And   response message indicates token is invalid or revoked
```

---

**Scenario: Refresh with expired token**

```
Given a refresh token that was issued more than 30 days ago
When  POST /api/v1/auth/refresh with that expired token
Then  response status is 401
And   response message indicates token is expired
```

---

**Scenario: Refresh with completely fabricated token**

```
Given no precondition
When  POST /api/v1/auth/refresh with a random string as refreshToken
Then  response status is 401
And   response message indicates token is invalid
```

---

**Scenario: Refresh after logout-all**

```
Given a user who called POST /api/v1/auth/logout-all
When  POST /api/v1/auth/refresh with any previously valid refresh token
Then  response status is 401
And   all refresh tokens for this user are revoked
```

---

**Scenario: Concurrent refresh with same token**

```
Given a valid refresh token
When  two simultaneous POST /api/v1/auth/refresh requests with the same token
Then  exactly one returns 200 with a new token pair
And   exactly one returns 401
And   no duplicate refresh tokens exist in the DB
```

---

**Scenario: Refresh for banned user**

```
Given a valid refresh token for a user who was subsequently banned
When  POST /api/v1/auth/refresh
Then  response status is 403
And   no new token pair is issued
```

---

**Scenario: Refresh with missing body field**

```
Given no precondition
When  POST /api/v1/auth/refresh with empty body {}
Then  response status is 400
And   issues array contains a message about required refreshToken field
```

---

### Feature: Logout

---

**Scenario: Successful logout**

```
Given a logged-in user with a valid accessToken and refreshToken
When  POST /api/v1/auth/logout with Bearer token and refreshToken in body
Then  response status is 200
And   response message is "Logged out successfully."
And   the refresh token is marked revoked in the DB
```

---

**Scenario: Logout with already-revoked refresh token**

```
Given a refresh token that was already revoked
When  POST /api/v1/auth/logout with that token
Then  response status is 200
And   operation is idempotent — no error thrown
```

---

**Scenario: Logout without Bearer token**

```
Given no precondition
When  POST /api/v1/auth/logout with no Authorization header
Then  response status is 401
And   response message indicates missing or invalid token
```

---

**Scenario: Access token remains valid after logout**

```
Given a user who successfully logged out
When  GET /api/v1/auth/me is called with the access token within 15 minutes
Then  response status is 200
And   access token is still valid (JWTs cannot be revoked — only refresh tokens can)
```

---

**Scenario: Logout from all devices**

```
Given a user logged in on 3 devices with 3 active refresh tokens
When  POST /api/v1/auth/logout-all with a valid Bearer token
Then  response status is 200
And   response message is "Logged out from all devices."
And   all 3 refresh tokens are marked revoked in the DB
```

---

### Feature: Get Current User (Me)

---

**Scenario: Get profile for CREATOR user**

```
Given a logged-in CREATOR user
When  GET /api/v1/auth/me with valid Bearer token
Then  response status is 200
And   response data.role is "CREATOR"
And   response data.creator is a populated object with displayName, slug, etc.
And   response data.listener is null
And   passwordHash is NOT present in the response
```

---

**Scenario: Get profile for LISTENER user**

```
Given a logged-in LISTENER user
When  GET /api/v1/auth/me with valid Bearer token
Then  response status is 200
And   response data.role is "LISTENER"
And   response data.listener is a populated object
And   response data.creator is null
```

---

**Scenario: Get profile for ADMIN user**

```
Given a logged-in ADMIN user
When  GET /api/v1/auth/me with valid Bearer token
Then  response status is 200
And   response data.role is "ADMIN"
And   response data.creator is null
And   response data.listener is null
```

---

**Scenario: Get profile with expired access token**

```
Given an expired access token (older than 15 minutes)
When  GET /api/v1/auth/me
Then  response status is 401
And   response message indicates token has expired
```

---

**Scenario: Get profile with malformed Bearer token**

```
Given a random string in the Authorization header
When  GET /api/v1/auth/me with "Bearer not-a-real-jwt"
Then  response status is 401
And   response message indicates invalid token
```

---

**Scenario: Get profile for soft-deleted user**

```
Given an access token for a user that was soft-deleted after the token was issued
When  GET /api/v1/auth/me with that token
Then  response status is 404
And   response message is "User not found."
```

---

**Scenario: Get profile without Authorization header**

```
Given no precondition
When  GET /api/v1/auth/me with no Authorization header
Then  response status is 401
```

---

## 🚧 Known Limitations

- `isVerified` is always `false` — email verification flow not yet implemented
- No ADMIN registration endpoint — ADMIN accounts created manually in the DB
- No account lockout after repeated failed login attempts — brute force is only mitigated by rate limiting
- Active sessions UI not yet built — refresh tokens store device/IP but no endpoint exposes this to the user
- No OAuth — email/password only
- Access tokens cannot be revoked early — they remain valid until natural expiry (15 min) even after logout. This is by design for stateless JWTs.

---

## 🔮 Future Enhancements

### Short Term

- [ ] **Email verification** — send verification link on register via Resend/SendGrid. Block login until verified. `POST /auth/verify-email?token=xxx`
- [ ] **Forgot password** — `POST /auth/forgot-password` generates a one-time token (stored hashed in `password_resets` table), emails a reset link. `POST /auth/reset-password` validates token and sets new password
- [ ] **Account lockout** — after 5 consecutive failed login attempts, lock account for 15 minutes. Store attempt count and lockout expiry in Redis with auto-expiry TTL
- [ ] **Active sessions endpoint** — `GET /auth/sessions` returns all active refresh tokens with `deviceInfo`, `ipAddress`, `createdAt`. `DELETE /auth/sessions/:id` revokes a specific session

### Medium Term

- [ ] **Apple Sign-In** — required for App Store compliance if any social login is offered. Validates Apple identity token server-side
- [ ] **Google OAuth** — for web and Android clients
- [ ] **Two-factor authentication (2FA)** — TOTP via authenticator app (RFC 6238). Store TOTP secret encrypted in DB. Add `POST /auth/2fa/enable`, `POST /auth/2fa/verify`, `POST /auth/2fa/disable`
- [ ] **Refresh token family tracking** — assign each token chain a `familyId`. If a revoked token in a family is used, revoke the entire family immediately — signals token theft
- [ ] **Suspicious login detection** — on login from a new IP geolocation or device, send email notification. Store last known IP/device per user
- [ ] **Token binding** — bind refresh tokens to device fingerprint so a stolen token from device A cannot be used on device B

### Long Term

- [ ] **Passwordless login** — magic link via email. One-time use, 15 min expiry, stored hashed in DB
- [ ] **Biometric auth delegation** — iOS client stores refresh token in Secure Enclave, Face ID/Touch ID gate unlocks it. Server is unaware — purely client-side security enhancement
- [ ] **SSO / SAML** — for enterprise podcast networks managing multiple creator accounts under one organisation
- [ ] **Comprehensive auth audit log** — record every auth event (login, logout, password change, token revoke, failed login) in `AdminAction` table with IP and device. Queryable by admin dashboard
- [ ] **re-authentication for sensitive actions** — require password confirmation before email change, account deletion, or Stripe payout changes — even with a valid session

---

## 🔑 Environment Variables

| Variable       | Required | Purpose                                                                                           |
| -------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`   | ✅       | Signs JWT access tokens and keys the refresh token HMAC-SHA256 hash. Min 32 chars, 64 recommended |
| `DATABASE_URL` | ✅       | Prisma connection to Supabase PostgreSQL (Session Pooler URL)                                     |
| `NODE_ENV`     | ✅       | Controls log verbosity, SSL config, and error message detail                                      |

---

_Module introduced: March 2026_
_Last updated: March 2026_
