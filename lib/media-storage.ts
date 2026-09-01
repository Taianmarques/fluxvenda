// Mídia recebida/enviada pelo WhatsApp (UazAPI ou Cloud API) só existe, do lado do provedor, num
// link temporário — a UazAPI apaga o arquivo original depois de poucos dias, e o link vira 404 pra
// sempre, mesmo a mensagem continuando salva no nosso histórico. Baixa o arquivo e guarda uma
// cópia permanente em disco (public/uploads/media), assim a mídia continua acessível mesmo depois
// do provedor apagar a dele.
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MEDIA_DIR = path.join(process.cwd(), "public", "uploads", "media");

const EXTENSION_BY_MIMETYPE: Record<string, string> = {
  "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/ogg": "ogg", "audio/opus": "ogg", "audio/wav": "wav", "audio/aac": "aac",
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "video/3gpp": "3gp", "video/quicktime": "mov",
  "application/pdf": "pdf",
};

function guessExtension(mimetype: string | null | undefined, url: string): string {
  if (mimetype) {
    const clean = mimetype.split(";")[0].trim().toLowerCase();
    if (EXTENSION_BY_MIMETYPE[clean]) return EXTENSION_BY_MIMETYPE[clean];
  }
  const fromUrl = url.split("?")[0].split(".").pop();
  if (fromUrl && fromUrl.length <= 5 && /^[a-z0-9]+$/i.test(fromUrl)) return fromUrl.toLowerCase();
  return "bin";
}

// Retorna a URL local própria (ex: "/uploads/media/<id>.mp3") ou null se o download falhar — quem
// chama deve usar a URL remota original como fallback nesse caso, pra não bloquear a mensagem.
export async function downloadAndStoreMedia(remoteUrl: string, mimetypeHint?: string): Promise<string | null> {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = guessExtension(mimetypeHint ?? res.headers.get("content-type"), remoteUrl);
    return await saveBuffer(buffer, ext);
  } catch (err) {
    console.error("[media-storage] erro ao baixar/guardar mídia:", err);
    return null;
  }
}

// Mídia que o ATENDENTE envia já chega pra gente em base64 (upload direto no chat) — nesse caso
// não precisa nem buscar de volta no provedor, só guardar o que já temos em mãos.
export async function storeBase64Media(base64: string, fileNameHint?: string): Promise<string | null> {
  try {
    const buffer = Buffer.from(base64, "base64");
    const ext = (fileNameHint?.split(".").pop() || "").toLowerCase();
    return await saveBuffer(buffer, /^[a-z0-9]{1,5}$/.test(ext) ? ext : "bin");
  } catch (err) {
    console.error("[media-storage] erro ao guardar mídia (base64):", err);
    return null;
  }
}

async function saveBuffer(buffer: Buffer, ext: string): Promise<string> {
  const fileName = `${randomUUID()}.${ext}`;
  await mkdir(MEDIA_DIR, { recursive: true });
  await writeFile(path.join(MEDIA_DIR, fileName), buffer);
  // URL absoluta (não relativa) — precisa funcionar tanto num <audio src> no navegador quanto
  // num fetch() do lado do servidor (ex: reencaminhar mensagem pra outra conversa).
  return `${process.env.NEXT_PUBLIC_APP_URL}/uploads/media/${fileName}`;
}
