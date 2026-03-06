// prisma.config.ts
// Updated configuration for Prisma 7+ projects.
// Ensure you have dotenv installed so env vars load when running
// Prisma CLI commands (migrate, db pull, etc.).
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // relative path to your schema file
  schema: "prisma/schema.prisma",

  // migrations directory
  migrations: {
    path: "prisma/migrations",
  },

  // choose "classic" or "binary" depending on your needs
  engine: "classic",

  datasource: {
    // connection URL is pulled from the environment; this is the
    // only place you should reference DATABASE_URL in Prisma 7
    url: env("DATABASE_URL"),

    // Additional options such as shadowDatabaseUrl, provider, etc.
    // can be added here as needed.
  },

  // you can also add generators or other config here if necessary
});
