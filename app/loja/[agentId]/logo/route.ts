import { prisma } from "@/lib/prisma";

// Serve a logo da loja como imagem (usada no manifest PWA e como favicon do catálogo)
export async function GET(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  const config = await prisma.agentConfig.findFirst({
    where: { OR: [{ storeSlug: agentId }, { id: agentId }] },
    select: { commerceEnabled: true, storeLogoBase64: true, storeLogoMimeType: true },
  });

  if (!config?.commerceEnabled || !config.storeLogoBase64) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(Buffer.from(config.storeLogoBase64, "base64"), {
    headers: {
      "Content-Type": config.storeLogoMimeType ?? "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
