import { prisma } from "@/lib/prisma";

// Serve a logo da empresa como imagem (manifest PWA e favicon da página de agendamento) —
// reusa a mesma logo cadastrada pra loja (storeLogoBase64)
export async function GET(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  const config = await prisma.agentConfig.findFirst({
    where: { OR: [{ storeSlug: agentId }, { id: agentId }] },
    select: { schedulingEnabled: true, storeLogoBase64: true, storeLogoMimeType: true },
  });

  if (!config?.schedulingEnabled || !config.storeLogoBase64) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(Buffer.from(config.storeLogoBase64, "base64"), {
    headers: {
      "Content-Type": config.storeLogoMimeType ?? "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
