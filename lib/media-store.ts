import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// A UazAPI devolve um link temporário pra mídia (foto, áudio, vídeo, documento) que expira — guardar
// só esse link no banco fazia as mídias "sumirem" das conversas depois de um tempo. Aqui a mídia é
// baixada na hora e gravada no disco da VPS (o app roda em pm2, o disco persiste entre deploys
// porque fica fora da pasta do código); a mensagem passa a apontar pra /api/midia/<arquivo>.
export const MEDIA_DIR = process.env.MEDIA_DIR || path.join(process.cwd(), "..", "fluxvenda-media");

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "video/3gpp": "3gp", "video/quicktime": "mov", "video/webm": "webm",
  "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac", "audio/webm": "webm", "audio/wav": "wav",
  "application/pdf": "pdf", "text/plain": "txt", "text/csv": "csv",
  "application/zip": "zip", "application/msword": "doc",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};
const MIME_BY_EXT = Object.fromEntries(Object.entries(EXT_BY_MIME).map(([m, e]) => [e, m]));

export function mimeFromFileName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

// Baixa a mídia e devolve o caminho local servido pelo app. Se qualquer coisa falhar, devolve o
// link original — melhor um link que talvez expire do que perder a mídia na hora.
export async function persistRemoteMedia(url: string, mimetype?: string | null): Promise<string> {
  if (!/^https?:\/\//i.test(url)) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = (mimetype || res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const ext = EXT_BY_MIME[mime] ?? (url.split("?")[0].split(".").pop() || "bin").slice(0, 5).replace(/[^a-z0-9]/gi, "") ?? "bin";
    const name = `${randomUUID()}.${ext || "bin"}`;
    await mkdir(MEDIA_DIR, { recursive: true });
    await writeFile(path.join(MEDIA_DIR, name), buf);
    return `/api/midia/${name}`;
  } catch (err) {
    console.error("[media-store] não foi possível guardar a mídia, mantendo o link original:", err);
    return url;
  }
}

// Lê os bytes de uma mídia de mensagem, seja ela guardada em disco (/api/midia/...) ou um link remoto.
export async function loadMediaBuffer(mediaUrl: string): Promise<ArrayBuffer> {
  const local = mediaUrl.match(/^\/api\/midia\/([0-9a-f-]{36}\.[a-z0-9]{1,5})$/i);
  if (local) {
    const b = await readFile(path.join(MEDIA_DIR, local[1]));
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  }
  const res = await fetch(mediaUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.arrayBuffer();
}

// Imagens ilustrativas dos formulários públicos — pasta separada das mídias das conversas, porque
// estas são servidas SEM login (/api/formularios/imagem/...) e as das conversas não.
export const FORM_IMAGE_DIR = path.join(MEDIA_DIR, "formularios");
export const FORM_IMAGE_URL_RE = /^\/api\/formularios\/imagem\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/i;
const FORM_IMAGE_MAX_BYTES = 3 * 1024 * 1024;

export async function saveFormImage(dataUrl: string): Promise<string> {
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error("Formato de imagem não suportado (use JPG, PNG ou WebP).");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > FORM_IMAGE_MAX_BYTES) throw new Error("Imagem grande demais (máx. 3MB).");
  const name = `${randomUUID()}.${EXT_BY_MIME[m[1]]}`;
  await mkdir(FORM_IMAGE_DIR, { recursive: true });
  await writeFile(path.join(FORM_IMAGE_DIR, name), buf);
  return `/api/formularios/imagem/${name}`;
}
