import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { MEDIA_DIR } from "@/lib/media-store";
import { urlBase } from "@/lib/mcp/oauth";

// Biblioteca do superadmin: o que o Claude cria (imagem, vídeo, áudio, PDF) fica guardado na
// plataforma. Arquivo pequeno vai em base64 pela própria ferramenta; vídeo usa um link de envio
// de uso único, porque não cabe numa chamada de ferramenta.

export const MAX_BASE64_BYTES = 10 * 1024 * 1024;
export const MAX_ENVIO_BYTES = 200 * 1024 * 1024;
const ENVIO_SEGUNDOS = 60 * 60;

export const TIPOS_MIDIA: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
  "audio/mpeg": "mp3", "application/pdf": "pdf",
};

// Confere pelos primeiros bytes que o arquivo é mesmo do tipo declarado
export function conteudoConfere(mime: string, b: Buffer) {
  const inicia = (hex: string, em = 0) => b.subarray(em, em + hex.length / 2).toString("hex") === hex;
  switch (mime) {
    case "image/png": return inicia("89504e470d0a1a0a");
    case "image/jpeg": return inicia("ffd8ff");
    case "image/webp": return inicia("52494646") && inicia("57454250", 8);
    case "image/gif": return inicia("47494638");
    case "video/mp4":
    case "video/quicktime": return inicia("66747970", 4);
    case "video/webm": return inicia("1a45dfa3");
    case "audio/mpeg": return inicia("494433") || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
    case "application/pdf": return inicia("25504446");
    default: return false;
  }
}

export const caminhoMidia = (arquivo: string) => path.join(MEDIA_DIR, arquivo);
export const urlMidia = (arquivo: string) => `${urlBase()}/api/midia/${arquivo}`;

export function registrarMidia(d: { id: string; profileId: string; nome: string; descricao: string; mime: string; tamanho: number; arquivo: string }) {
  return prisma.bibliotecaMidia.create({ data: d });
}

export async function salvarMidiaBase64(d: { profileId: string; nome: string; descricao: string; mime: string; base64: string }) {
  const buf = Buffer.from(d.base64.replace(/^data:[^,]*,/, ""), "base64");
  if (buf.length === 0) throw new Error("Arquivo vazio ou base64 inválido.");
  if (buf.length > MAX_BASE64_BYTES) throw new Error("Arquivo grande demais para base64 (máx. 10 MB). Use admin_preparar_envio_midia.");
  if (!conteudoConfere(d.mime, buf)) throw new Error(`O conteúdo não corresponde ao tipo ${d.mime}.`);
  const id = randomUUID();
  const arquivo = `${id}.${TIPOS_MIDIA[d.mime]}`;
  await mkdir(MEDIA_DIR, { recursive: true });
  await writeFile(caminhoMidia(arquivo), buf, { flag: "wx" });
  return registrarMidia({ id, profileId: d.profileId, nome: d.nome, descricao: d.descricao, mime: d.mime, tamanho: buf.length, arquivo });
}

function chave() {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo) throw new Error("SESSION_SECRET não configurado");
  return new TextEncoder().encode(segredo);
}

export async function criarLinkEnvio(d: { profileId: string; nome: string; descricao: string; mime: string }) {
  const id = randomUUID();
  const token = await new SignJWT({ proposito: "mcp-midia", ...d })
    .setProtectedHeader({ alg: "HS256" }).setJti(id).setExpirationTime(`${ENVIO_SEGUNDOS}s`).sign(chave());
  return { url: `${urlBase()}/api/mcp/midia/${token}`, expiraEmSegundos: ENVIO_SEGUNDOS };
}

export async function lerLinkEnvio(token: string) {
  try {
    const { payload: p } = await jwtVerify(token, chave(), { algorithms: ["HS256"] });
    if (p.proposito !== "mcp-midia" || typeof p.jti !== "string") return null;
    return { id: p.jti, profileId: String(p.profileId), nome: String(p.nome), descricao: String(p.descricao), mime: String(p.mime) };
  } catch {
    return null;
  }
}
