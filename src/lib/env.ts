import { z } from "zod/v4";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
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
});

export type Env = z.infer<typeof envSchema>;

function formatError(prefix: string, issues: z.core.$ZodIssue[]) {
  const detail = issues.map((issue) => issue.path.join(".") || issue.message).join(", ");
  return `${prefix}: ${detail}`;
}

function parseEnv(): Env {
  if (process.env.NODE_ENV === "test") {
    return process.env as unknown as Env;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(formatError("Invalid environment configuration", parsed.error.issues));
  }

  return parsed.data;
}

export const env = parseEnv();

export function requireGroqApiKey(): string {
  if (!env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY environment variable");
  }

  return env.GROQ_API_KEY;
}

export function requireAwsS3Env() {
  const missing: string[] = [];

  if (!env.AWS_REGION) missing.push("AWS_REGION");
  if (!env.AWS_ACCESS_KEY_ID) missing.push("AWS_ACCESS_KEY_ID");
  if (!env.AWS_SECRET_ACCESS_KEY) missing.push("AWS_SECRET_ACCESS_KEY");
  if (!env.S3_BUCKET_NAME) missing.push("S3_BUCKET_NAME");

  if (missing.length > 0) {
    throw new Error(`Missing AWS/S3 environment variables: ${missing.join(", ")}`);
  }

  return {
    region: env.AWS_REGION,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    bucketName: env.S3_BUCKET_NAME,
  };
}
