import { prisma } from "@/lib/prisma";

// Manifest dinâmico por loja — permite "adicionar à tela inicial" com o nome da empresa
export async function GET(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  const config = await prisma.agentConfig.findUnique({
    where: { id: agentId },
    select: { commerceEnabled: true, team: { select: { name: true } } },
  });

  const name = config?.commerceEnabled ? (config.team?.name || "Catálogo") : "Catálogo";

  return Response.json(
    {
      name,
      short_name: name.length > 12 ? name.slice(0, 12) : name,
      start_url: `/loja/${agentId}`,
      scope: `/loja/${agentId}`,
      display: "standalone",
      background_color: "#f9fafb",
      theme_color: "#ffffff",
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } }
  );
}
