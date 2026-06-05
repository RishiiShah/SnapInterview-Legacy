import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI-only connection (migrate / db execute). Prefer DIRECT_URL: a
    // transaction-mode pooler can't run migrations reliably, and the runtime
    // client uses its own adapter connection, not this URL.
    // Use process.env (not Prisma's env() helper) so `prisma generate` succeeds
    // during postinstall when no DB URL is available — generate needs only the schema.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
