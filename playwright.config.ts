import { defineConfig, devices } from "@playwright/test";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const appEnv = {
  NODE_ENV: "test",
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  AUTH_SECRET: process.env.AUTH_SECRET ?? "test-auth-secret-32-chars-minimum",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "placeholder",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "placeholder",
  GROQ_API_KEY: process.env.GROQ_API_KEY ?? "placeholder",
  AWS_REGION: process.env.AWS_REGION ?? "us-east-1",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? "placeholder",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? "placeholder",
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME ?? "placeholder",
  ENABLE_TEST_AUTH: process.env.ENABLE_TEST_AUTH ?? "1",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    env: appEnv,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
