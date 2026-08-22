import crypto from "crypto";

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h
const OTP_TTL_MS = 10 * 60 * 1000; // 10min

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function emailVerifyExpiry(): Date {
  return new Date(Date.now() + EMAIL_VERIFY_TTL_MS);
}

export function passwordResetExpiry(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TTL_MS);
}

// Código de 6 dígitos pro código de verificação do WhatsApp no cadastro —
// curto de propósito, pra digitar fácil no celular.
export function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function otpExpiry(): Date {
  return new Date(Date.now() + OTP_TTL_MS);
}
