# 🛠 Project Commands Reference

This file serves as a **central reference for all important commands** used in this project.  
It includes **development scripts, production scripts, Prisma database commands, linting, formatting, and placeholders for CI/CD workflows**.

---

## 📌 NPM Scripts

| Script                             | Command               | Description                                                                                                  |
| ---------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Development server**             | `npm run dev`         | Starts the development server using TypeScript via `ts-node`. Supports hot reload and fast iteration.        |
| **Build**                          | `npm run build`       | Cleans the `dist` folder and compiles all TypeScript code into JavaScript. Required before production start. |
| **Production server**              | `npm start`           | Starts the server using the compiled JavaScript from the `dist` folder.                                      |
| **Lint code**                      | `npm run lint`        | Runs ESLint to analyze code quality and detect potential errors.                                             |
| **Auto-fix lint issues**           | `npm run lint:fix`    | Attempts to automatically fix linting issues where possible.                                                 |
| **Format code**                    | `npm run format`      | Runs Prettier to format all project files according to consistent code style.                                |
| **Lint + Build check**             | `npm run check`       | Runs linting and build scripts sequentially. Useful for CI/CD or pre-commit checks.                          |
| **Generate Prisma client**         | `npm run db:generate` | Regenerates the Prisma client after modifying `schema.prisma`. Does **not** modify the database.             |
| **Create & apply dev migrations**  | `npm run db:migrate`  | Creates a new migration and applies it to the **development database**. Does **not delete existing data**.   |
| **Apply migrations in production** | `npm run db:deploy`   | Applies existing migrations to **production database** safely. **Never resets or deletes data.**             |
| **Prisma Studio**                  | `npm run db:studio`   | Opens the Prisma GUI to inspect and manage database records.                                                 |
| **Post-install**                   | `npm run postinstall` | Runs automatically after `npm install` to regenerate the Prisma client.                                      |

---

## ⚙ Prisma Database Commands

These are **direct Prisma CLI commands** for reference.  
They can be run directly with `npx prisma <command>` or through npm scripts.

| Command                                     | Description                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `npx prisma generate`                       | Generate or update the Prisma client after schema changes.                                    |
| `npx prisma migrate dev --name <migration>` | Create a new migration for development and apply it to your local database.                   |
| `npx prisma migrate deploy`                 | Apply all pending migrations in production **without wiping data**.                           |
| `npx prisma migrate reset`                  | ⚠️ DANGER: Resets the database and applies all migrations. Only use in development.           |
| `npx prisma db pull`                        | Pull the current database schema into `schema.prisma`. Useful for introspecting existing DBs. |
| `npx prisma studio`                         | Launch Prisma Studio in the browser to inspect and edit database records visually.            |

---

## 🧹 Linting & Formatting

| Command            | Description                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| `npm run lint`     | Check code for potential errors, unused variables, and code quality issues. |
| `npm run lint:fix` | Automatically fix linting issues where possible.                            |
| `npm run format`   | Run Prettier to format all project files.                                   |

> 💡 Tip: Use `npm run lint:fix && npm run format` before committing code to ensure a clean codebase.

---

## 🚀 Build & Development

| Command         | Description                                                 |
| --------------- | ----------------------------------------------------------- |
| `npm run dev`   | Run development server (hot reload, no need to build).      |
| `npm run build` | Compile TypeScript code into JavaScript inside `dist/`.     |
| `npm start`     | Run the compiled production server.                         |
| `npm run check` | Check linting + build together. Ideal for CI/CD pre-checks. |

---

## 🔧 CI/CD Placeholders

These are **future commands** for automation, deployments, and pipelines.  
You can extend this section when adding GitHub Actions, GitLab CI, or other CI/CD tools.

| Command             | Description                                                       |
| ------------------- | ----------------------------------------------------------------- |
| `npm run ci:lint`   | Run lint checks in CI pipeline.                                   |
| `npm run ci:test`   | Run automated tests (to be added if testing is implemented).      |
| `npm run ci:build`  | Compile code in CI environment before deployment.                 |
| `npm run ci:deploy` | Run deployment workflow in CI/CD (Prisma deploy + build + start). |

> 🔹 Keep this section updated to match your CI/CD pipelines.

---

## 📚 Recommended Workflow

### Development

```bash
# Run dev server with hot reload
npm run dev

# Update Prisma schema and create migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Lint and format code before commit
npm run lint:fix
npm run format
```

---

## 🚀 Production Deployment

```bash
# Install dependencies
npm install

# Apply migrations safely
npm run db:deploy

# Compile TypeScript
npm run build

# Start production server
npm start
```

---

## 🗄️ Inspect Database

```bash
# Open GUI to inspect or edit DB records
npm run db:studio
```

---

## 💡 Notes

```bash
- ⚠️ Never run prisma migrate reset or prisma db push --force-reset in production. This will delete all data.
- 📌 Always commit migration files to version control so production can safely deploy with npm run db:deploy.
- 🛠️ Keep lint, format, and check scripts as part of your pre-commit or CI/CD pipeline.
- 🔄 Update this file whenever new scripts, tools, or commands are added to the project.
```
