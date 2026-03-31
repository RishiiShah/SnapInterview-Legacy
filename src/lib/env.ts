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
  NEXT_PUBLIC_APP_URL: true,
  APP_URL: true,
  ENABLE_TEST_AUTH: true,
});

export type Env = z.infer<typeof envSchema>;

function formatError(prefix: string, issues: z.core.$ZodIssue[]) {
  const detail = issues.map((issue) => issue.path.join(".") || issue.message).join(", ");
  return `${prefix}: ${detail}`;
}

export function parseEnvFrom(source: NodeJS.ProcessEnv): Env {
  const schema = source.NODE_ENV === "test" ? testEnvSchema : envSchema;
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new Error(formatError("Invalid environment configuration", parsed.error.issues));
  }

  return parsed.data as Env;
}

export const env = parseEnvFrom(process.env);

export function requireGroqApiKey(): string {
  if (!env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY environment variable");
  }

  return env.GROQ_API_KEY;
}

export function requireAwsS3Env() {
  const region = env.AWS_REGION;
  const accessKeyId = env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  const bucketName = env.S3_BUCKET_NAME;

  if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
    const missing: string[] = [];
    if (!region) missing.push("AWS_REGION");
    if (!accessKeyId) missing.push("AWS_ACCESS_KEY_ID");
    if (!secretAccessKey) missing.push("AWS_SECRET_ACCESS_KEY");
    if (!bucketName) missing.push("S3_BUCKET_NAME");
    throw new Error(`Missing AWS/S3 environment variables: ${missing.join(", ")}`);
  }

  return {
    region,
    accessKeyId,
    secretAccessKey,
    bucketName,
  };
}
