import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { MEDIA_DIR, mimeFromFileName } from "@/lib/media-store";

// Serve a mídia guardada em disco (ver lib/media-store.ts). Exige sessão (proxy.ts) e o nome do
// arquivo é um UUID, então só quem está logado e enxerga a mensagem tem o link. Suporta Range pra
// o player de áudio/vídeo conseguir avançar.
export async function GET(req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[0-9a-f-]{36}\.[a-z0-9]{1,5}$/i.test(file)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const full = path.join(MEDIA_DIR, file);
  try {
    const { size } = await stat(full);
    const data = await readFile(full);
    const type = mimeFromFileName(file);
    const headers: Record<string, string> = {
      "Content-Type": type,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };
    const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start > end || start >= size) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      return new NextResponse(new Uint8Array(data.subarray(start, end + 1)), {
        status: 206,
        headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
      });
    }
    return new NextResponse(new Uint8Array(data), { headers: { ...headers, "Content-Length": String(size) } });
  } catch {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
}
