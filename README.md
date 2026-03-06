# 🎙️ Podara Backend

> Backend API for an independent podcast creator platform. Built with Fastify, TypeScript, Prisma, Supabase, and Cloudflare R2.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js with TypeScript |
| Framework | Fastify |
| ORM | Prisma |
| Database | Supabase PostgreSQL |
| Asset Storage | Supabase Storage |
| Audio Storage | Cloudflare R2 |
| Cache + Queue | Redis + BullMQ |
| Auth | JWT + Refresh Tokens |
| Payments | Stripe Connect |

---

## 📋 Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) v18 or higher
- [Git](https://git-scm.com/)
- [VS Code](https://code.visualstudio.com/) (recommended)

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

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true"

# Supabase
SUPABASE_URL="https://xxxxxxxxxxxx.supabase.co"
SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Cloudflare R2
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key-id"
R2_SECRET_ACCESS_KEY="your-secret-access-key"
R2_BUCKET_NAME="podara-audio"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="your-long-random-secret-here"
JWT_REFRESH_SECRET="your-long-random-refresh-secret-here"

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
npx prisma migrate dev
```

### 6. Start the development server

```bash
npm run dev
```

Server will be running at `http://localhost:3000`

---

## 📦 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start production server |
| `npx prisma studio` | Open Prisma database GUI |
| `npx prisma migrate dev` | Run database migrations |
| `npx prisma generate` | Regenerate Prisma client |

---

## 📁 Folder Structure

```
podara-backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── creators/
│   │   ├── listeners/
│   │   ├── episodes/
│   │   ├── streaming/
│   │   ├── subscriptions/
│   │   ├── search/
│   │   └── notifications/
│   ├── shared/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── config/
│   ├── queue/
│   ├── app.ts
│   └── index.ts
├── prisma/
│   └── schema.prisma
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

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
git push origin main
```

---

## 🚢 Deployment

This project is deployed on [Railway](https://railway.app).

Every push to the `main` branch triggers an automatic redeployment.

---

## 🔒 Environment Variables

Never commit your `.env` file. It is listed in `.gitignore` by default.

For Railway deployment, add all environment variables under:
`Railway Dashboard → Your Project → Variables`

---

## 📄 License

ISC