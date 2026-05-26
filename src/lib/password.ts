import bcrypt from "bcrypt";
import {
  hashPassword as hashBetterAuthPassword,
  verifyPassword as verifyBetterAuthPassword,
} from "better-auth/crypto";

const BCRYPT_PREFIXES = ["$2a$", "$2b$", "$2x$", "$2y$"];

function isBcryptHash(hash: string) {
  return BCRYPT_PREFIXES.some((prefix) => hash.startsWith(prefix));
}

export async function hashCredentialPassword(password: string) {
  return hashBetterAuthPassword(password);
}

export async function verifyCredentialPassword({
  password,
  hash,
}: {
  password: string;
  hash: string;
}) {
  if (isBcryptHash(hash)) {
    return bcrypt.compare(password, hash);
  }

  try {
    return await verifyBetterAuthPassword({ password, hash });
  } catch {
    return false;
  }
}