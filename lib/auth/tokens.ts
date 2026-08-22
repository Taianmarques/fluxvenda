import crypto from "crypto";

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function emailVerifyExpiry(): Date {
  return new Date(Date.now() + EMAIL_VERIFY_TTL_MS);
}

export function passwordResetExpiry(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TTL_MS);
}
