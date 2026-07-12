import { prisma } from "@/lib/prisma";

// Manifest dinâmico por empresa — permite "adicionar à tela inicial" com o nome da empresa
export async function GET(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  const config = await prisma.agentConfig.findFirst({
    where: { OR: [{ storeSlug: agentId }, { id: agentId }] },
    select: { schedulingEnabled: true, storeLogoBase64: true, storeLogoMimeType: true, team: { select: { name: true } } },
  });

  const name = config?.schedulingEnabled ? (config.team?.name || "Agendamento") : "Agendamento";
  const hasLogo = Boolean(config?.schedulingEnabled && config.storeLogoBase64);

  return Response.json(
    {
      name,
      short_name: name.length > 12 ? name.slice(0, 12) : name,
      start_url: `/agendar/${agentId}`,
      scope: `/agendar/${agentId}`,
      display: "standalone",
      background_color: "#f9fafb",
      theme_color: "#ffffff",
      ...(hasLogo
        ? {
            icons: [
              {
                src: `/agendar/${agentId}/logo`,
                sizes: "512x512",
                type: config!.storeLogoMimeType ?? "image/png",
                purpose: "any",
              },
            ],
          }
        : {}),
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } }
  );
}
