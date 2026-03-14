# 🎙️ Podara Backend

> Backend API for an independent podcast creator platform. Built with Fastify, TypeScript, Prisma, Supabase, and Cloudflare R2.

---

## 📋 Overview

Podara is a full-stack podcast platform where independent creators upload episodes and listeners subscribe to individual creators. The backend handles auth, audio streaming, subscriptions, and monetization via Stripe Connect.

---

## 🧱 Tech Stack

| Layer       | Technology                   | Purpose                                |
| ----------- | ---------------------------- | -------------------------------------- |
| Runtime     | Node.js v22 + TypeScript 5.9 | Strongly typed server-side JavaScript  |
| Framework   | Fastify v5                   | High performance HTTP framework        |
| ORM         | Prisma v6.19.2               | Type-safe database queries             |
| Database    | Supabase PostgreSQL          | Managed PostgreSQL with free tier      |
| Assets      | Supabase Storage             | Profile pics, thumbnails, cover art    |
| Audio       | Cloudflare R2                | Audio files — zero egress fees         |
| Cache/Queue | Redis + BullMQ               | Caching and async job processing       |
| Auth        | JWT + Refresh Tokens         | 15min access + 30day refresh rotation  |
| Payments    | Stripe Connect               | Creator monetization and payouts       |
| Hosting     | Railway                      | Auto-deploy on git push                |
| Processing  | FFmpeg + HLS                 | Adaptive bitrate audio streaming       |
| Transcripts | OpenAI Whisper               | Auto-generated timestamped transcripts |

---

## ✅ Prerequisites

- [Node.js](https://nodejs.org/) v22+
- [Git](https://git-scm.com/)
- [VS Code](https://code.visualstudio.com/) (recommended)
- Supabase account (free)
- Cloudflare account (free)
- Railway account (free)

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/podara-backend.git
cd podara-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://postgres.xxxx:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Supabase
SUPABASE_URL="https://xxxxxxxxxxxx.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Cloudflare R2
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="podara-audio"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="your-long-random-secret-min-32-chars"

# App
PORT=3000
NODE_ENV="development"
```

### 4. Generate Prisma client

```bash
npx prisma generate
```

### 5. Run database migrations

```bash
npx prisma migrate dev --name init
```

### 6. Start development server

```bash
npm run dev
```

Server runs at `http://localhost:3000`

---

## 📦 Available Scripts

| Script                | Description                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`         | Start the development server using TypeScript directly via `ts-node`. Useful for local development without compiling the project first. |
| `npm run build`       | Clean the `dist` folder and compile TypeScript into JavaScript using the TypeScript compiler.                                           |
| `npm start`           | Start the production server from the compiled JavaScript inside the `dist` directory.                                                   |
| `npm run lint`        | Run the linter to analyze the codebase for potential issues and maintain code quality.                                                  |
| `npm run lint:fix`    | Automatically fix linting issues where possible.                                                                                        |
| `npm run format`      | Format the entire project using Prettier to maintain consistent code style.                                                             |
| `npm run check`       | Run both linting and build checks to verify that the project is ready for production or CI pipelines.                                   |
| `npm run db:generate` | Generate the Prisma client after changes to `schema.prisma`. This does **not** modify the database.                                     |
| `npm run db:migrate`  | Create and apply new database migrations during development. Generates migration files and updates the database schema safely.          |
| `npm run db:deploy`   | Apply existing migrations in production environments without resetting or deleting existing data.                                       |
| `npm run db:studio`   | Open the Prisma database GUI to inspect and manage database records.                                                                    |
| `npm run postinstall` | Automatically regenerate the Prisma client after installing dependencies.                                                               |

---

## 🗄 Database Workflow

This project uses **Prisma migrations** to manage database schema changes safely.

### Development Workflow

When you update the Prisma schema:

```bash
npm run db:migrate
```

---

## 📁 Folder Structure

```
podara-backend/
├── src/
│   ├── modules/
│   │   ├── auth/           ← register, login, JWT, refresh tokens
│   │   ├── creators/       ← creator profiles, episodes
│   │   ├── listeners/      ← listener profiles, subscriptions
│   │   ├── episodes/       ← upload, stream, HLS
│   │   ├── streaming/      ← signed URLs, R2 integration
│   │   ├── subscriptions/  ← Stripe Connect, payments
│   │   ├── search/         ← full-text search
│   │   └── notifications/  ← push notifications
│   ├── shared/
│   │   ├── middleware/     ← authenticate, requireRole
│   │   ├── utils/          ← hash, jwt, validators
│   │   ├── config/         ← prisma client, redis
│   │   └── types/          ← shared TypeScript types
│   ├── queue/              ← BullMQ job definitions
│   └── index.ts            ← app entry point
├── prisma/
│   └── schema.prisma       ← database schema (16 models)
├── logs/                   ← dev.log, error.log, combined.log
├── prisma.config.ts        ← Prisma connection config
├── .env                    ← environment variables (never commit)
├── railway.toml            ← Railway deployment config
└── tsconfig.json
```

---

## 🌐 API Endpoints

### Auth — `/api/v1/auth`

| Method | Endpoint                  | Auth      | Description                             |
| ------ | ------------------------- | --------- | --------------------------------------- |
| `POST` | `/api/v1/auth/register`   | Public    | Register as LISTENER, CREATOR, or ADMIN |
| `POST` | `/api/v1/auth/login`      | Public    | Login and receive token pair            |
| `POST` | `/api/v1/auth/refresh`    | Public    | Rotate refresh token                    |
| `POST` | `/api/v1/auth/logout`     | Protected | Revoke current refresh token            |
| `POST` | `/api/v1/auth/logout-all` | Protected | Revoke all device sessions              |
| `GET`  | `/api/v1/auth/me`         | Protected | Get current user profile                |

---

## 🌿 Git Workflow

```bash
# All development happens on dev branch
git checkout dev

# After completing a feature
git add .
git commit -m "feat: your feature description"
git push origin dev

# To deploy to production
git checkout main
git merge dev
git push origin main  # ← Railway auto-deploys
```

---

## 🚢 Deployment

Deployed on [Railway](https://railway.app). Every push to `main` triggers automatic redeployment.

Add all environment variables under:

```
Railway Dashboard → Your Project → Variables
```

No Docker needed. Railway detects Node.js automatically.

---

## 🔒 Security

- JWT access tokens expire in **15 minutes**
- Refresh tokens **rotate on every use** — old tokens are revoked immediately
- Refresh tokens stored as **HMAC-SHA256 hashes**, never raw
- Passwords hashed with **PBKDF2-SHA512**, 100,000 iterations
- **Rate limiting** on all auth endpoints (10 req/min)
- **Signed R2 URLs** expire after 2 hours
- **RLS enabled** on all Supabase tables
- Never commit `.env` — it is in `.gitignore`

---

## 📄 License

ISC — Built by Wajahat Ali
