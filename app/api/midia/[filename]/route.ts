// Serve mídia do WhatsApp guardada localmente (ver lib/media-storage.ts) lendo o arquivo do disco
// a cada requisição — de propósito NÃO usa a pasta public/, já que o `next start` dessa versão só
// enxerga arquivos que já existiam quando o processo iniciou (um arquivo novo dava 404 até reiniciar).
// Nome do arquivo é um uuid imprevisível (ver proxy.ts) — funciona como token de acesso, sem exigir
// sessão, mesmo modelo já usado em /agenda e /agendar.
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { MEDIA_DIR, contentTypeForExtension } from "@/lib/media-storage";

const VALID_FILENAME = /^[a-zA-Z0-9-]+\.[a-z0-9]{1,5}$/;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!VALID_FILENAME.test(filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(path.join(MEDIA_DIR, filename));
    const ext = filename.split(".").pop() ?? "";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentTypeForExtension(ext),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
