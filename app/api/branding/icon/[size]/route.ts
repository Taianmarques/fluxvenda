import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

// Ícones do manifest.ts — servidos aqui em vez de estáticos pra poderem refletir o upload
// do admin em runtime. manifest.ts continua 100% estático (sem API de request-time), só
// essa rota é dinâmica; sem ícone customizado, cai pro PNG estático original em public/.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;

  const settings = await prisma.platformSettings.findUnique({
    where: { id: "singleton" },
    select: {
      pwaIcon192Base64: true, pwaIcon192MimeType: true,
      pwaIcon512Base64: true, pwaIcon512MimeType: true,
      pwaIcon512MaskableBase64: true, pwaIcon512MaskableMimeType: true,
    },
  });

  let base64: string | null | undefined;
  let mimeType: string | null | undefined;
  let staticFile: string;

  switch (size) {
    case "192":
      base64 = settings?.pwaIcon192Base64; mimeType = settings?.pwaIcon192MimeType; staticFile = "icon-192.png";
      break;
    case "512":
      base64 = settings?.pwaIcon512Base64; mimeType = settings?.pwaIcon512MimeType; staticFile = "icon-512.png";
      break;
    case "512-maskable":
      base64 = settings?.pwaIcon512MaskableBase64; mimeType = settings?.pwaIcon512MaskableMimeType; staticFile = "icon-512-maskable.png";
      break;
    default:
      return new NextResponse("Not found", { status: 404 });
  }

  const buffer = base64
    ? Buffer.from(base64, "base64")
    : await readFile(path.join(process.cwd(), "public", staticFile));

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType ?? "image/png",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
