# 🧠 CLAUDE.md — Podara Project Context

> This file gives Claude full context about the Podara project.
> **Always read this before making any code changes.**

---

## 📌 Project Summary

**Podara** (`podara.io`) is an independent podcast creator platform. Creators upload episodes, listeners subscribe to individual creators and pay a monthly fee. The platform takes a percentage cut of each subscription via Stripe Connect.

This is a portfolio project built by **Wajahat Ali** — a senior iOS engineer targeting top-tier companies. It demonstrates full-stack capabilities: production-grade Node.js backend + native iOS client.

---

## 💡 App Concept

- Creators upload podcast episodes (audio files)
- Listeners discover creators and subscribe for a monthly fee ($2–5)
- Premium episodes are paywalled — only subscribers can stream full content
- Stripe Connect handles money flow: `listener → platform (cut) → creator`
- Free tier: listeners can browse and preview episodes
- Future: All Access pass for subscribing to all creators at once

---

## 🧱 Tech Stack

| Layer | Technology | Critical Notes |
|---|---|---|
| Runtime | Node.js v22 + TypeScript 5.9 | ESModule, strict, verbatimModuleSyntax ON |
| Framework | Fastify v5 | NOT Express — Fastify-specific APIs only |
| ORM | Prisma v6.19.2 | `prisma.config.ts` pattern — NOT schema url |
| Database | Supabase PostgreSQL | Session Pooler URL only — pgbouncer compatible |
| Assets | Supabase Storage | Images, thumbnails only — NOT audio |
| Audio | Cloudflare R2 | AWS S3-compatible SDK, zero egress fees |
| Queue | BullMQ + Redis | Async FFmpeg audio processing jobs |
| Auth | JWT (@fastify/jwt) | 15min access + 30day refresh rotation |
| Payments | Stripe Connect | Not yet implemented — planned |
| Hosting | Railway | Auto-deploy from `main` branch |

---

## 🏗️ Architecture Decisions

### Modular Monolith
NOT microservices. Single Railway server with internally separated modules. Each module has its own `router`, `controller`, `service`, and `repository`. Extract to microservices only at Stage 3+ scale.

### Backend Never Streams Audio
The Node.js server never serves audio bytes directly. It only returns signed R2 URLs. The iOS client streams directly from Cloudflare CDN. Server load stays independent of listener count.

### HLS Adaptive Bitrate
Audio is transcoded by FFmpeg into HLS segments at multiple bitrates (128k, 256k, 320k). iOS `AVPlayer` handles quality switching automatically based on network conditions.

### JWT Strategy
- Access tokens: **15 minute expiry**, JWT signed with `@fastify/jwt`
- Refresh tokens: **30 day expiry**, stored as HMAC-SHA256 hash in DB (never raw), rotate on every use

### TypeScript Config
`verbatimModuleSyntax` is **ON**. This means:
- Use `import type` for type-only imports
- Use `export type` for type-only exports
- All imports need `.js` extension even for `.ts` files

---

## 🗄️ Database Schema

16 models in Supabase PostgreSQL. Key relationships:

| Model | Notes |
|---|---|
| `User` | Base identity. Creator and Listener extend User (one-to-one) |
| `Creator` | Stripe Connect fields, denormalized counters, slug for SEO |
| `Listener` | Own username namespace, separate from Creator |
| `Episode` | HLS fields, transcript (JSON), isPremium, soft delete |
| `Subscription` | Bridges Listener ↔ Creator with full Stripe lifecycle |
| `Play` | Analytics — every listen event with completion rate |
| `RefreshToken` | Stores tokenHash (never raw), deviceInfo, ipAddress |
| `Payout` | Creator earnings — platformFee + netAmount |
| `Report` + `AdminAction` | Moderation and full audit trail |

### Prisma Config Pattern
This project uses `prisma.config.ts` (NOT `url` in `schema.prisma`).
- `engine: 'classic'`
- `datasource.url` → Session Pooler URL only
- `dotenv` manually loaded inside `prisma.config.ts` because Prisma skips auto env loading when config file is present
- `schema.prisma` still needs `url = env("DATABASE_URL")` — Prisma 6.19.2 requires it even with config file

---

## 📁 File Structure

```
src/
├── modules/auth/
│   ├── auth.schema.ts       ← Zod v4 validation schemas
│   ├── auth.service.ts      ← business logic, DB calls
│   ├── auth.controller.ts   ← HTTP layer, parse + respond
│   └── auth.routes.ts       ← Fastify route registration
├── shared/
│   ├── types/index.ts       ← JwtPayload, AuthenticatedUser, module augmentation
│   ├── middleware/
│   │   └── authenticate.ts  ← JWT verify, requireRole guard
│   └── utils/
│       ├── hash.ts          ← PBKDF2 password hashing
│       └── jwt.ts           ← refresh token generation + hashing
└── index.ts                 ← Fastify app, plugins, routes, error handler
```

---

## ⚠️ Key Conventions

### TypeScript
- All imports use `.js` extension: `import from './auth.service.js'`
- Type-only imports: `import type { FastifyRequest } from 'fastify'`
- Type-only exports: `export type { Role }`
- Optional fields passed to Prisma use `?? null` not `?? undefined`
- `exactOptionalPropertyTypes` is ON — no `undefined` where `null` is expected

### Fastify
- Use `request.currentUser` — **NOT** `request.user` (conflicts with `@fastify/jwt`)
- Module augmentation for `FastifyRequest` lives in `src/shared/types/index.ts`
- Error handler uses `FastifyError` type for typed `error.statusCode`
- `trustProxy: true` — required for Railway to get real client IP
- All routes prefixed with `/api/v1/`

### Prisma
- `prisma.config.ts` in project root — NOT `prisma/config.ts`
- `schema.prisma` datasource needs `url = env("DATABASE_URL")` even with config file
- All money fields use `Decimal` type — **never** `Float`
- Soft deletes with `deletedAt DateTime?` — never hard delete users or episodes
- `@@map()` used on all models for clean snake_case table names in PostgreSQL

### Auth
- Passwords: PBKDF2-SHA512, 100,000 iterations, stored as `iterations:salt:hash`
- Refresh tokens: random 64-byte hex, stored as HMAC-SHA256 hash
- Token rotation: old refresh token revoked on every refresh call
- Never return `passwordHash` in any response
- Email enumeration prevention: same error for wrong email and wrong password

---

## ✅ Current Build Status

### Completed
- [x] Project scaffold — Fastify + TypeScript + Prisma + Supabase connected
- [x] Database schema — 16 models migrated to Supabase
- [x] Auth module — register (LISTENER/CREATOR/ADMIN), login, refresh, logout, me
- [x] JWT + refresh token rotation
- [x] Rate limiting, CORS, global error handler, file logging
- [x] GitHub repos created (`podara-backend`, `podara-ios`)
- [x] Railway deployment configured
- [x] Branch protection on `main`

### Next Up
- [ ] Creator module — profile management, episode upload
- [ ] R2 integration — signed URL generation, audio upload
- [ ] FFmpeg + BullMQ — async audio processing pipeline
- [ ] HLS streaming endpoint
- [ ] Listener module — subscriptions, play tracking
- [ ] Stripe Connect integration
- [ ] iOS app — AVPlayer, HLS streaming, auth flow

---

## 🔑 Environment Variables Reference

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://...pooler...` | Session Pooler URL only |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Project URL |
| `SUPABASE_ANON_KEY` | `eyJh...` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJh...` | Secret — server only |
| `R2_ACCOUNT_ID` | `abc123...` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | `key...` | R2 API token |
| `R2_SECRET_ACCESS_KEY` | `secret...` | R2 secret key |
| `R2_BUCKET_NAME` | `podara-audio` | Audio bucket name |
| `REDIS_URL` | `redis://localhost:6379` | BullMQ + caching |
| `JWT_SECRET` | `long-random-string` | Minimum 32 characters |
| `PORT` | `3000` | Railway sets this automatically |
| `NODE_ENV` | `development` | `production` on Railway |

---

*Keep this file updated as the project evolves. Last updated: March 2026*
