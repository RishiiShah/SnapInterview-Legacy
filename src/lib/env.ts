import { z } from "zod/v4";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  APP_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GROQ_API_KEY: z.string().min(1).optional(),
  AWS_REGION: z.string().min(1).optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_BUCKET_NAME: z.string().min(1).optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM: z.string().optional(),
  FORMSPREE_SUPPORT_URL: z.string().url().optional(),
  ENABLE_TEST_AUTH: z.enum(["0", "1"]).optional(),
  CSRF_TRUSTED_ORIGIN_SUFFIXES: z.string().optional(),
  CSRF_TRUSTED_ORIGINS: z.string().optional(),
  CRON_SECRET: z.string().min(1).optional(),
});

const testEnvSchema = envSchema.extend({
  DATABASE_URL: z.string().min(1).default("postgresql://placeholder:placeholder@localhost:5432/placeholder"),
  AUTH_SECRET: z.string().min(1).default("test-auth-secret-32-chars-minimum"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
}).partial({
  GOOGLE_CLIENT_ID: true,
  GOOGLE_CLIENT_SECRET: true,
  GROQ_API_KEY: true,
  AWS_REGION: true,
  AWS_ACCESS_KEY_ID: true,
  AWS_SECRET_ACCESS_KEY: true,
  S3_BUCKET_NAME: true,
  SMTP_HOST: true,
  SMTP_PORT: true,
  SMTP_USER: true,
  SMTP_PASS: true,
  SMTP_FROM: true,
  FORMSPREE_SUPPORT_URL: true,
  NEXT_PUBLIC_APP_URL: true,
  APP_URL: true,
  ENABLE_TEST_AUTH: true,
});

export type Env = z.infer<typeof envSchema>;

function formatError(prefix: string, issues: z.core.$ZodIssue[]) {
  const detail = issues.map((issue) => issue.path.join(".") || issue.message).join(", ");
  return `${prefix}: ${detail}`;
}

const MIN_PRODUCTION_SECRET_LENGTH = 32;
const PLACEHOLDER_SECRETS = new Set([
  "test-auth-secret-32-chars-minimum",
  "your-auth-secret",
  "your-secret-here",
  "change-me",
  "changeme",
]);

function assertStrongProductionSecret(name: string, value: string | undefined, required = false) {
  if (!value) {
    if (required) {
      throw new Error(`Invalid environment configuration: ${name} is required in production`);
    }
    return;
  }

  const normalized = value.trim().toLowerCase();
  const isPlaceholder =
    PLACEHOLDER_SECRETS.has(normalized) ||
    normalized.includes("placeholder") ||
    normalized.includes("changeme");

  if (value.length < MIN_PRODUCTION_SECRET_LENGTH || isPlaceholder) {
    throw new Error(
      `Invalid environment configuration: ${name} must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters and not a placeholder value in production`
    );
  }
}

function validateProductionSecrets(parsed: Env) {
  if (parsed.NODE_ENV !== "production") return;
  // Skip strict validation during the build phase where secrets might not be injected yet
  if (
    process.env.SKIP_ENV_VALIDATION === "1" ||
    process.env.npm_lifecycle_event === "build" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    return;
  }

  assertStrongProductionSecret("AUTH_SECRET", parsed.AUTH_SECRET, true);
  assertStrongProductionSecret("CRON_SECRET", parsed.CRON_SECRET, false);
}

export function parseEnvFrom(rawEnv: Record<string, unknown> = process.env): Env {
  const isTest = rawEnv.NODE_ENV === "test";
  const schema = isTest ? testEnvSchema : envSchema;
  const result = schema.safeParse(rawEnv);

  if (!result.success) {
    const message = formatError("Invalid environment configuration", result.error.issues);
    if (rawEnv.NODE_ENV === "production" || rawEnv.NODE_ENV === "test") {
      throw new Error(message);
    }
    console.warn(`[env warning] ${message}`);
    return (rawEnv as unknown) as Env;
  }

  validateProductionSecrets(result.data);
  return result.data;
}

export const env = parseEnvFrom(process.env);

export function isAwsS3Configured(currentEnv = env): boolean {
  return Boolean(
    currentEnv.AWS_REGION &&
    currentEnv.AWS_ACCESS_KEY_ID &&
    currentEnv.AWS_SECRET_ACCESS_KEY &&
    currentEnv.S3_BUCKET_NAME
  );
}

export function requireAwsS3Env(currentEnv = env) {
  if (!isAwsS3Configured(currentEnv)) {
    throw new Error("AWS S3 environment variables are not configured");
  }
  return {
    region: currentEnv.AWS_REGION as string,
    accessKeyId: currentEnv.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: currentEnv.AWS_SECRET_ACCESS_KEY as string,
    bucketName: currentEnv.S3_BUCKET_NAME as string,
  };
}

export function requireGroqApiKey(currentEnv = env): string {
  if (!currentEnv.GROQ_API_KEY) {
    if (currentEnv.NODE_ENV === "test") {
      return "gsk_test_mock_key_placeholder";
    }
    throw new Error("GROQ_API_KEY environment variable is not configured");
  }
  return currentEnv.GROQ_API_KEY;
}
