import path from "path";
import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// ─────────────────────────────────────────────────────────────
// Podara — Prisma Configuration
// Prisma v6.19.2 + Supabase PostgreSQL
// ─────────────────────────────────────────────────────────────

config();

export default defineConfig({
  schema: path.join(import.meta.dirname, "prisma/schema.prisma"),
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
