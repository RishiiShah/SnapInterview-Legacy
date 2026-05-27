import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use process.env instead of Prisma's env() helper so that `prisma generate`
    // succeeds during postinstall when DATABASE_URL may not yet be available.
    // Generate only needs the schema, not a live database connection.
    url: process.env.DATABASE_URL ?? "",
  },
});
