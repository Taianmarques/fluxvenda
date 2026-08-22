import bcryptjs from "bcryptjs";
import { z } from "zod";

const SALT_ROUNDS = 12;

// bcryptjs (puro JS) em vez de bcrypt nativo — o Dockerfile (node:22-alpine) não
// tem toolchain de build (python3/make/g++), então um binário nativo quebraria
// o build de produção.
export function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export const passwordSchema = z
  .string()
  .min(8, { message: "A senha precisa ter pelo menos 8 caracteres." })
  .regex(/[a-zA-Z]/, { message: "A senha precisa ter pelo menos uma letra." })
  .regex(/[0-9]/, { message: "A senha precisa ter pelo menos um número." });
