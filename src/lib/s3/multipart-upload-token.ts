import crypto from "crypto";
import { env } from "@/lib/env";

const UPLOAD_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;
const COMPLETION_TOKEN_TTL_MS = 15 * 60 * 1000;

type MultipartTokenPurpose = "upload" | "completion";

type MultipartUploadTokenPayload = {
  purpose: MultipartTokenPurpose;
  userId: string;
  interviewId: string;
  key: string;
  uploadId: string;
  expiresAt: number;
};

type MultipartTokenInput = Omit<MultipartUploadTokenPayload, "expiresAt" | "purpose">;
type MultipartCompletionTokenExpected = Omit<MultipartTokenInput, "uploadId">;

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(encodedPayload: string) {
  return crypto
    .createHmac("sha256", env.AUTH_SECRET)
    .update(encodedPayload)
    .digest("base64url");
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createMultipartToken(
  input: MultipartTokenInput,
  purpose: MultipartTokenPurpose,
  ttlMs: number,
) {
  const payload: MultipartUploadTokenPayload = {
    ...input,
    purpose,
    expiresAt: Date.now() + ttlMs,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function parseAndVerifyMultipartToken(
  token: string,
): MultipartUploadTokenPayload | null {
  const tokenParts = token.split(".");
  if (tokenParts.length !== 2) return null;

  const [encodedPayload, signature] = tokenParts;
  if (!encodedPayload || !signature) return null;
  if (!constantTimeEqual(signature, sign(encodedPayload))) return null;

  try {
    return JSON.parse(decodeBase64Url(encodedPayload)) as MultipartUploadTokenPayload;
  } catch {
    return null;
  }
}

export function createMultipartUploadToken(input: MultipartTokenInput) {
  return createMultipartToken(input, "upload", UPLOAD_TOKEN_TTL_MS);
}

export function verifyMultipartUploadToken(
  token: string,
  expected: MultipartTokenInput,
) {
  const payload = parseAndVerifyMultipartToken(token);
  if (!payload) return false;

  return (
    payload.purpose === "upload" &&
    payload.expiresAt > Date.now() &&
    payload.userId === expected.userId &&
    payload.interviewId === expected.interviewId &&
    payload.key === expected.key &&
    payload.uploadId === expected.uploadId
  );
}

export function createMultipartCompletionToken(input: MultipartTokenInput) {
  return createMultipartToken(input, "completion", COMPLETION_TOKEN_TTL_MS);
}

export function verifyMultipartCompletionToken(
  token: string,
  expected: MultipartCompletionTokenExpected,
) {
  const payload = parseAndVerifyMultipartToken(token);
  if (!payload) return false;

  return (
    payload.purpose === "completion" &&
    payload.expiresAt > Date.now() &&
    payload.userId === expected.userId &&
    payload.interviewId === expected.interviewId &&
    payload.key === expected.key
  );
}
