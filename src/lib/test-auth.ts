import { cookies } from "next/headers";

export const E2E_TEST_AUTH_COOKIE = "snapinterview.e2e-auth";

export type E2ETestIdentity = {
  userId: string;
  email: string;
  onboardingCompletedAt?: string | null;
};

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function getTestAuthSecret() {
  const secret = env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required when test auth is enabled");
  }

  return secret;
}

async function getHmacKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getTestAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export function isTestAuthEnabled(): boolean {
return env.NODE_ENV === "test" && env.ENABLE_TEST_AUTH === "1";
}
export async function encodeE2ETestIdentity(identity: E2ETestIdentity) {
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(identity)));
  const signature = await crypto.subtle.sign("HMAC", await getHmacKey(), new TextEncoder().encode(payload));
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function decodeE2ETestIdentity(rawValue: string | undefined) {
  if (!rawValue) {
    return null;
  }

  try {
    const [payload, signature] = rawValue.split(".");
    if (!payload || !signature) {
      return null;
    }

    const verified = await crypto.subtle.verify(
      "HMAC",
      await getHmacKey(),
      base64UrlToBytes(signature),
      new TextEncoder().encode(payload),
    );

    if (!verified) {
      return null;
    }

    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as E2ETestIdentity;
    if (!parsed.userId || !parsed.email) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function getE2ETestIdentity() {
  if (!isTestAuthEnabled()) {
    return null;
  }

  const store = await cookies();
  return decodeE2ETestIdentity(store.get(E2E_TEST_AUTH_COOKIE)?.value);
}
