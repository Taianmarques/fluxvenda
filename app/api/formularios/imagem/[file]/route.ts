import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { FORM_IMAGE_DIR, mimeFromFileName } from "@/lib/media-store";

// Pública (o formulário é aberto sem login) — serve só a pasta de imagens dos formulários,
// nunca as mídias das conversas (ver lib/media-store.ts).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(file)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const data = await readFile(path.join(FORM_IMAGE_DIR, file));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mimeFromFileName(file),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
}
